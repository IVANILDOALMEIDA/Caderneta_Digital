# Caderneta Digital — Como usar

Caderneta digital escolar: alunos e encarregados, ocorrências, presenças, notas, pautas e boletins.
---

## 1. Rodar no PC (Windows)

### Primeira vez
1. **Instale o Node.js** (versão LTS) em https://nodejs.org. É a única coisa a instalar.
3. **Dê dois cliques em `start.bat`.** Abre uma janela preta que mostra algo como:
   ```
   Caderneta Digital a funcionar!
     Neste PC:      http://localhost:3000
     Outros aparelhos (mesma rede): http://192.168.1.25:3000
   ```
   **Não feche essa janela** enquanto quiser usar a app.
4. **Abra o navegador** em `http://localhost:3000`.
5. **Entre** com o utilizador `admin` e a **palavra-passe provisória que aparece na janela preta na primeira execução** (é gerada ao acaso e só aparece uma vez, por isso anote-a). A app obriga a trocá-la logo a seguir. Se a perder antes de entrar, apague a pasta `data/` (só se ainda não tiver dados!) e inicie de novo.

### Configuração inicial (como administrador)
1. **Administração → Utilizadores:** crie as contas dos professores.
2. **Administração → Turmas:** cadastre as turmas.
3. **Administração → Disciplinas:** crie as disciplinas e escolha os professores de cada uma.
4. **Administração → Regras de avaliação:** confirme pesos, escala e nota mínima com o regulamento da escola.
5. Registe os alunos (botão "Novo aluno").

### Parar e voltar a ligar
- **Parar:** feche a janela preta (ou carregue em `Ctrl + C`).
- **Ligar:** `start.bat` outra vez.
- **Arrancar sozinho com o Windows:** dê dois cliques em `instalar-arranque.bat`. Para desfazer, use `remover-arranque.bat`.

### Mac ou Linux
Instale o Node.js, abra o terminal na pasta e escreva `node server.js`.

### Mudar a porta
Se a porta 3000 estiver ocupada, na linha de comandos: `set PORT=8080 && node server.js` e abra `http://localhost:8080`.

---

## 2. Usar no telemóvel (e outros aparelhos)

O telemóvel acede ao PC pela rede. **O PC tem de estar ligado, com a janela do servidor aberta, e o telemóvel na mesma rede Wi-Fi.**

### Passo a passo
1. No PC, inicie a Caderneta e veja a linha **"Outros aparelhos (mesma rede)"**, por exemplo `http://192.168.1.25:3000`.
2. No telemóvel, ligue-se ao **mesmo Wi-Fi** do PC.
3. Abra o **Chrome** (Android) ou o **Safari** (iPhone) e escreva esse endereço.
4. Entre com a sua conta.

Se não abrir:
- O Windows pode perguntar "Permitir acesso?" ao Node.js. Marque **Redes privadas** e permita. Se não apareceu, abra o **Firewall do Windows → Permitir uma aplicação** e adicione o Node.js.
- Confirme que o PC e o telemóvel estão na **mesma rede**. Redes de "convidados" costumam isolar os aparelhos.
- O PC não pode estar em suspensão.
- Sem Wi-Fi, pode ligar o telemóvel ao ponto de acesso (hotspot) do PC, ou o PC ao hotspot do telemóvel.

> **Dica:** o endereço do PC pode mudar quando o router reinicia. Peça a quem gere a rede para **reservar um IP fixo** para o PC. Assim o endereço do telemóvel nunca muda.

### Colocar o ícone no ecrã inicial

**Android (Chrome)**
1. Abra o endereço da Caderneta.
2. Toque nos **três pontos (⋮) → "Adicionar ao ecrã inicial"** (ou "Instalar aplicação").
3. Confirme. Aparece o ícone da Caderneta.

Nota: como o endereço usa `http` (sem cadeado), o Chrome normalmente cria apenas um **atalho**, que abre dentro do navegador. Para ter a instalação completa (ecrã inteiro, sem barra do navegador):
1. No Chrome do telemóvel, abra `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
2. Ative a opção, escreva o endereço da app (ex.: `http://192.168.1.25:3000`) e toque em **Relançar**.
3. Abra o endereço de novo e use **⋮ → Instalar aplicação**.

Esta opção reduz a segurança do Chrome para esse endereço. Use só em telemóveis pessoais e numa rede de confiança.

**iPhone (Safari)**
1. Abra o endereço no **Safari**.
2. Toque em **Partilhar → "Adicionar ao ecrã principal"**.

---

## 3. Dados e cópias de segurança

Tudo fica na pasta **`data/`** do PC:
- `db.json`: alunos, ocorrências, presenças, notas, utilizadores.
- `fotos/` e `anexos/`: fotos dos alunos e ficheiros das ocorrências.

**Cópia automática:** o servidor guarda cópias diárias de `db.json` na pasta `backups/` (as últimas 30). **Não incluem fotos nem anexos.**

**Recomendado:** copie a pasta `data` **inteira** para uma pen ou outro disco de vez em quando.

**Atualizar de uma versão anterior:** extraia a nova versão noutra pasta, copie a pasta `data` da antiga para dentro da nova, pare o servidor antigo, inicie o novo e carregue em `Ctrl + F5` no navegador.

---

## 4. Perfis

| | Administrador | Professor |
|---|---|---|
| Alunos e ocorrências | tudo | cria e edita; só edita/elimina as suas ocorrências |
| Eliminar alunos | sim (vão para a reciclagem 30 dias) | não |
| Notas | todas as disciplinas | só as disciplinas que lhe foram atribuídas |
| Utilizadores, turmas, disciplinas, regras, histórico | sim | não |

---

## 5. Ficheiros do projeto
```
Caderneta_Digital/
├── server.js            servidor (API, login, dados)
├── start.bat            inicia o servidor no Windows
├── instalar-arranque.bat / remover-arranque.bat
├── public/
│   ├── index.html       estrutura da página
│   ├── style.css        visual
│   ├── app.js           lógica da aplicação
│   └── manifest.json, sw.js, icon.svg   (instalação no telemóvel)
├── data/                os seus dados (não apagar!)
└── backups/             cópias automáticas (criada ao arrancar)
```
