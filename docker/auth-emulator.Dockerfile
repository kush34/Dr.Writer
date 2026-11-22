FROM node:22-slim
RUN npm install -g firebase-tools@13 --no-audit --no-fund
WORKDIR /app
COPY firebase.json ./firebase.json
EXPOSE 9099
CMD ["firebase", "emulators:start", "--only", "auth", "--project", "demo-drwriter"]
