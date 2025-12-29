# Bíblia Multi-Idiomas (PT/JA) — Desktop (Electron)

![License](https://img.shields.io/badge/license-MIT-green.svg)
![Electron](https://img.shields.io/badge/Electron-app-blue.svg)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows-lightgrey.svg)
[![Build Windows](https://github.com/welington-m/biblia4u/actions/workflows/build-windows.yml/badge.svg)](https://github.com/welington-m/biblia4u/actions/workflows/build-windows.yml)


Aplicativo desktop para comparar versículos bíblicos em múltiplos idiomas (atualmente **Português** e **Japonês**), com seleção de traduções, intervalo de versículos e exibição em **Tabela comparativa**.

O frontend é um app estático (HTML/CSS/JS) estilizado com MaterializeCSS, empacotado como aplicativo desktop usando Electron.

---

## ✨ Recursos

- Seleção de **Livro / Capítulo / Verso início / Verso fim**
- Lista de versículos (base PT) com **seleção manual** (checkbox)
- Janela separada com **Tabela comparativa** (somente resultado)
- Troca de traduções por idioma:
  - Português (PT)
  - Japonês (JA)
- Preferências:
  - Tema **Dark / Light**
  - Controle de fonte da Tabela comparativa (até **76px**)
- Configurações persistidas via **localStorage**
- Proxy local `/pp` para consumir API externa e evitar problemas de CORS

---

## 🧱 Stack

- Electron
- Node.js (Express)
- http-proxy-middleware (proxy `/pp`)
- MaterializeCSS (UI)
- HTML / CSS / JavaScript

---

## 📁 Estrutura do projeto

