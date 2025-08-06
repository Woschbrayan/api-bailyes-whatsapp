<h1 align="center">🔥 WhatsApp API - Node.js (Baileys Multi-Device)</h1>

<p align="center">
  API RESTful pronta pra uso com suporte completo ao WhatsApp Web Multi Dispositivo usando <strong>Baileys</strong>.
  <br><br>
  Ideal para automações, chatbots, notificações e integrações profissionais.
</p>

<div align="center">
  <a href="https://github.com/woschbrayan">
    <img src="https://img.shields.io/badge/Autor-Brayan_Wosch-black?style=for-the-badge&logo=github" alt="Autor">
  </a>
  <a href="https://brayanwosch.com.br">
    <img src="https://img.shields.io/badge/Site-brayanwosch.com.br-black?style=for-the-badge" alt="Site">
  </a>
</div>

---

## 🚀 Visão Geral

Esse projeto é uma **implementação Node.js** com base na biblioteca [Baileys](https://github.com/WhiskeySockets/Baileys), encapsulada em uma API simples, robusta e extensível para interações via WhatsApp Web.

Com ele você pode:

- Conectar e controlar instâncias via QR Code ou webhook
- Enviar mensagens de texto, mídia, documentos, áudios, vídeos
- Integrar com chatbot, n8n, ou qualquer sistema externo
- Criar múltiplas instâncias com controle por token
- Trabalhar com eventos em tempo real (webhook)

---

## 📦 Tecnologias

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Baileys (MD)](https://github.com/WhiskeySockets/Baileys)
- [MongoDB](https://www.mongodb.com/)
- [Docker Compose](https://docs.docker.com/compose/)

---

## ⚙️ Instalação Local

```bash
git clone https://github.com/woschbrayan/whatsapp-api-nodejs.git
cd whatsapp-api-nodejs
cp .env.example .env
yarn install
yarn dev
