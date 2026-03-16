#!/bin/sh
set -eu

N8N_DATA_DIR="${N8N_USER_FOLDER:-/home/node/.n8n}"
WORKFLOW_MARKER_FILE="$N8N_DATA_DIR/.project-seed-imported.sha256"
CREDS_MARKER_FILE="$N8N_DATA_DIR/.project-credentials-imported.sha256"
WORKFLOW_FILE="/seed/workflow.json"
CREDENTIALS_FILE="/tmp/n8n-generated-credentials.json"

mkdir -p "$N8N_DATA_DIR"

file_hash() {
  sha256sum "$1" | awk '{ print $1 }'
}

import_if_changed() {
  target_file="$1"
  marker_file="$2"
  import_cmd="$3"

  current_hash="$(file_hash "$target_file")"
  previous_hash=""

  if [ -f "$marker_file" ]; then
    previous_hash="$(cat "$marker_file")"
  fi

  if [ "$current_hash" != "$previous_hash" ]; then
    echo "Importing $(basename "$target_file") into n8n..."
    sh -c "$import_cmd"
    printf '%s' "$current_hash" > "$marker_file"
  fi
}

if [ "${N8N_IMPORT_CREDENTIALS:-true}" = "true" ]; then
  node <<'EOF_NODE'
const fs = require('fs');

const credentials = [];

const docsCredentialId = 'e5xrtTyMCfd8MH3G';
const docsCredentialName =
  process.env.N8N_GOOGLE_DOCS_CREDENTIAL_NAME || 'Google Docs account';

const geminiCredentialId = 'Mj9DKEcV4Is3LYzI';
const geminiCredentialName =
  process.env.N8N_GOOGLE_GEMINI_CREDENTIAL_NAME ||
  'Google Gemini(PaLM) Api account';

const docsEmail = process.env.N8N_GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
const docsPrivateKey = (process.env.N8N_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '')
  .replace(/\\n/g, '\n')
  .trim();

if (docsEmail && docsPrivateKey) {
  const impersonate =
    (process.env.N8N_GOOGLE_SERVICE_ACCOUNT_IMPERSONATE || 'false').toLowerCase() === 'true';
  const delegatedEmail = process.env.N8N_GOOGLE_SERVICE_ACCOUNT_DELEGATED_EMAIL || '';

  credentials.push({
    id: docsCredentialId,
    name: docsCredentialName,
    type: 'googleApi',
    data: {
      region: 'us-central1',
      email: docsEmail,
      privateKey: docsPrivateKey,
      inpersonate: impersonate,
      delegatedEmail,
      httpNode: false,
      scopes: '',
    },
  });
}

if (process.env.GOOGLE_GEMINI_API_KEY) {
  credentials.push({
    id: geminiCredentialId,
    name: geminiCredentialName,
    type: 'googlePalmApi',
    data: {
      host:
        process.env.N8N_GOOGLE_GEMINI_API_HOST ||
        'https://generativelanguage.googleapis.com',
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
    },
  });
}

if (credentials.length > 0) {
  fs.writeFileSync('/tmp/n8n-generated-credentials.json', JSON.stringify(credentials, null, 2));
}
EOF_NODE

  if [ -f "$CREDENTIALS_FILE" ]; then
    import_if_changed \
      "$CREDENTIALS_FILE" \
      "$CREDS_MARKER_FILE" \
      "n8n import:credentials --input=\"$CREDENTIALS_FILE\""
  fi
fi

if [ "${N8N_IMPORT_SEED:-true}" = "true" ] && [ -f "$WORKFLOW_FILE" ]; then
  import_if_changed \
    "$WORKFLOW_FILE" \
    "$WORKFLOW_MARKER_FILE" \
    "n8n import:workflow --input=\"$WORKFLOW_FILE\""
fi

exec n8n start
