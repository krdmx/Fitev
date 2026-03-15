FROM docker.n8n.io/n8nio/n8n:latest

USER root

RUN mkdir -p /seed

COPY infra/n8n/scripts/bootstrap.sh /bootstrap.sh
COPY infra/n8n/workflows/workflow.seed.json /seed/workflow.json

RUN chmod +x /bootstrap.sh && chown -R node:node /bootstrap.sh /seed

USER node

ENTRYPOINT ["/bootstrap.sh"]
