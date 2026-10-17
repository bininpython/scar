# SCAR • Gestão Fitness

Sistema próprio de gestão para academias, em português, com **React + TypeScript**, API **Node.js** e banco **SQLite** persistente. Interface responsiva em preto, branco e amarelo, com demonstração separada dos dados reais.

Não contém código, marca, arquivos ou integrações proprietárias do Sistema SCA. Implementação independente de funcionalidades comuns à gestão fitness.

## O que está implementado

- **Painel:** alunos ativos, mensalidades da competência, pendências, frequência dos últimos sete dias e agenda de hoje.
- **Alunos:** cadastro, edição, busca, filtros, perfil individual, pausa/cancelamento e exportação CSV.
- **Planos:** valores mensais e benefícios. Planos com alunos vinculados não podem ser excluídos.
- **Financeiro:** geração por competência, sem duplicação por aluno; recebimento manual por Pix, cartão, dinheiro ou transferência; cancelamento de cobranças em aberto; relatório CSV.
- **Agenda:** aulas com professor, horário, duração, capacidade e reservas individuais; bloqueio de lotação e de reserva duplicada.
- **Frequência:** um check-in por aluno por dia, com bloqueio de matrícula inativa e de mensalidade vencida em aberto.
- **Treinos:** fichas individuais, exercícios, séries, repetições, carga, descanso, validade e impressão/PDF pelo navegador.
- **Avaliações:** histórico de peso, altura, cintura e gordura corporal, com comparação do peso entre avaliações.
- **Relatórios:** recebimento por competência, receita potencial por plano, exportação financeira e de presenças.
- **Equipe:** perfis de administrador, recepção e professor, desativação de acessos e alteração da própria senha.
- **Dados:** SQLite, backup consistente e exportação JSON dos registros operacionais.

## Acesso direto temporário

O sistema abre diretamente no painel, sem tela de login e sem criação obrigatória de usuário. O acesso tem permissões de administrador para os módulos da academia. Os controles de sair, alterar senha e gerenciar equipe ficam ocultos nesse modo.

Enquanto esse modo estiver ativo, qualquer pessoa que consiga acessar o endereço do sistema pode consultar e alterar os dados da academia.

Para reativar o login depois, execute `npm run setup` caso ainda não exista um administrador e inicie o servidor com `SCAR_REQUIRE_LOGIN=1`. As contas e senhas existentes são preservadas.

## Iniciar no computador

Requer **Node.js 24.15 ou superior da linha 24** (testado com 24.19). O SQLite usado é o módulo integrado ao Node. Não requer instalar banco separado ou fornecer chaves de APIs.

```bash
git clone https://github.com/bininpython/scar.git
cd scar
npm ci
npm run build
npm start
```

Quando o login for reativado, o comando `setup` pede nome, e-mail e senha do primeiro administrador. A senha tem entrada oculta e deve conter no mínimo 12 caracteres. Não há senha padrão para dados reais.

Abra **http://127.0.0.1:3000**. Em seguida:

1. Ajuste o nome da academia em **Configurações**.
2. Cadastre os **Planos**.
3. Cadastre seus **Alunos**, indicando plano e vencimento.
4. Em **Financeiro**, escolha a competência e clique em **Gerar mensalidades**.
5. Cadastre aulas, treinos e avaliações conforme necessário. A gestão de equipe retorna ao reativar o login.

### Demonstração

Depois de instalar e compilar:

```bash
npm run demo
```

- Endereço: http://127.0.0.1:3000
- A demonstração também abre direto no painel. As credenciais abaixo só são usadas com `SCAR_REQUIRE_LOGIN=1`.
- E-mail: `demo@scar.local`
- Senha: `Demo@Scar2026`
- Dados inteiramente fictícios em `data/demo.db`, separados de `data/scar.db`.
- A tela identifica claramente o modo de demonstração. Não use esse modo para dados reais ou publique suas credenciais de demonstração como acesso à produção.
- Os servidores normal e demo usam a mesma porta por padrão; encerre um antes de iniciar o outro.

### Desenvolvimento

Em um terminal: `npm start` (após o primeiro build). Em outro: `npm run dev`. O Vite fornece o frontend em http://127.0.0.1:5173 e encaminha `/api` ao servidor da porta 3000.

```bash
npm run build    # Verificação TypeScript + bundle de produção
npm test         # Testes de integração HTTP e SQLite
npm run format   # Formatação do código
```

## Perfis de acesso

A tabela abaixo se aplica quando `SCAR_REQUIRE_LOGIN=1`. No acesso direto temporário, o painel opera com permissões de administrador, exceto a gestão de contas.

| Recurso                             | Administrador     | Recepção          | Professor |
| ----------------------------------- | ----------------- | ----------------- | --------- |
| Alunos                              | Consulta/edição   | Consulta/edição   | Consulta  |
| Planos                              | Consulta/edição   | Consulta          | Consulta  |
| Financeiro e relatórios financeiros | Sim               | Sim               | Não       |
| Agenda e reservas                   | Sim               | Sim               | Sim       |
| Frequência                          | Consulta/registro | Consulta/registro | Consulta  |
| Treinos e avaliações                | Sim               | Não               | Sim       |
| Academia, equipe e exportação JSON  | Sim               | Não               | Não       |
| Alterar a própria senha             | Sim               | Sim               | Sim       |

As restrições são verificadas na API. Dados de avaliações/treinos não são enviados ao perfil recepção; lançamentos financeiros não são enviados ao professor. Não existe portal de autoatendimento de aluno nesta versão.

## Regras financeiras e operacionais

- Valores monetários são armazenados em **centavos inteiros**.
- Cada aluno tem uma mensalidade por competência. Gerar novamente preserva cobranças existentes, inclusive canceladas. Alunos pausados, cancelados ou matriculados depois da competência não recebem nova cobrança.
- A mensalidade usa o preço do plano no momento da geração. Alterar um plano não modifica cobranças passadas.
- Vencimento permitido entre os dias 1 e 28 para funcionar em todos os meses.
- Pagamentos confirmados e cobranças canceladas são finais nesta versão; não há estorno contábil pela interface. Confira valor/data antes de confirmar.
- O total recebido no painel considera **a competência da cobrança**, não o mês em que o dinheiro foi recebido. A exportação inclui ambas as datas para conciliação.
- Receita potencial é uma projeção dos planos dos alunos ativos, não caixa recebido.
- Check-in usa a data de **America/Sao_Paulo** e bloqueia débitos com vencimento anterior ao dia atual. Não há integração física com catracas.
- Reservas são para alunos ativos, respeitam a capacidade e impedem aulas de dias anteriores. Não há repetição automática de aulas.
- Prescrições e avaliações são inseridas por profissionais; o sistema não diagnostica nem gera prescrição clínica automática.

## Banco, backup e recuperação

Os dados ficam em `data/scar.db` por padrão. O diretório `data/`, as senhas, os arquivos `.env` e backups **não são versionados**.

```bash
npm run backup
```

Cria um snapshot consistente em `backups/`, usando a API de backup SQLite. Armazene uma cópia fora da máquina, com acesso restrito. Backup completo contém hashes de senha e sessões, portanto é sensível. Para copiar de outra origem, defina `SCAR_DB`.

**Recuperação:** pare o servidor; preserve o banco atual e seus arquivos `-wal` e `-shm` em uma pasta separada; coloque o arquivo de backup como `data/scar.db`; inicie novamente. Nunca substitua um banco enquanto o processo está executando. Valide sua rotina de recuperação antes de operar com dados reais.

A exportação JSON do painel contém registros de negócio e **não substitui um backup completo**. Não há importação JSON pela interface nesta versão.

## Hospedagem

O projeto está preparado para **um servidor Node com disco persistente**, ou Docker. O mesmo processo serve frontend e API. Servidores/volumes efêmeros, hospedagem estática e funções Vercel não mantêm este banco de forma adequada. Não existe configuração Supabase nem dependência de conta externa.

### Docker

```bash
docker compose build
docker compose up -d
```

Acesse http://127.0.0.1:3000. O volume `scar_data` mantém o banco. O container executa como usuário não privilegiado. Não execute `docker compose down -v` se quiser preservar os dados. O fluxo Docker é fornecido, mas não foi executado neste ambiente de desenvolvimento.

### Variáveis de ambiente

| Variável              | Padrão         | Uso                                                      |
| --------------------- | -------------- | -------------------------------------------------------- |
| `SCAR_REQUIRE_LOGIN`  | `0`            | `1` reativa o login; sem essa opção o painel abre direto |
| `HOST`                | `127.0.0.1`    | Interface de escuta; `0.0.0.0` para container/rede       |
| `PORT`                | `3000`         | Porta do servidor                                        |
| `SCAR_DB`             | `data/scar.db` | Caminho do banco                                         |
| `SCAR_ORIGIN`         | vazio          | Origem HTTPS pública autorizada para API/proxy           |
| `SCAR_SECURE_COOKIE`  | vazio          | Use `1` atrás de HTTPS                                   |
| `SCAR_ADMIN_NAME`     | interativo     | Nome para o primeiro `setup`                             |
| `SCAR_ADMIN_EMAIL`    | interativo     | E-mail para o primeiro `setup`                           |
| `SCAR_ADMIN_PASSWORD` | interativo     | Senha para o primeiro `setup`                            |

O servidor lê variáveis do processo. Para um arquivo local, copie `.env.example` para `.env` e execute `node --env-file=.env server/index.mjs`. Nunca publique esse arquivo.

Para acesso pela internet, coloque um proxy HTTPS na frente do serviço, defina `SCAR_ORIGIN` com a origem real e `SCAR_SECURE_COOKIE=1`, preserve o volume e restrinja as permissões dos dados. O login limita tentativas por endereço de conexão; atrás de proxy, esse limite é compartilhado pelos usuários do proxy.

## Estrutura

```text
src/                 Interface React, API client, tipos e estilos
server/db.mjs        Esquema SQLite, senha scrypt e dados de demonstração
server/index.mjs     API, sessões, permissões, validações e servidor estático
server/setup.mjs     Criação do primeiro administrador
server/backup.mjs    Snapshot consistente do SQLite
tests/               Testes de integração com banco temporário
public/              Identidade visual local
```

## Segurança e escopo da primeira versão

Quando o login está habilitado: sessões de 8 horas com cookies HttpOnly/SameSite; token CSRF e validação de origem para escrita; senhas scrypt com salt; SQL parametrizado; validação de entradas; perfis no servidor; trilha de auditoria no banco; saída CSV protegida contra fórmulas. A senha pode ser alterada pelo ícone de escudo no cabeçalho; sessões de outros dispositivos são revogadas.

Aplicação para **uma academia em uma instância**. O estado é carregado integralmente por perfil: grandes bases precisarão de paginação e consultas específicas. Não inclui multiempresa, cobrança bancária, Pix automático, emissão fiscal, WhatsApp, reconhecimento facial, integração de catracas, acesso de alunos ou recuperação de senha por e-mail. O cadastro e a gestão dessas integrações devem ser um projeto separado.

## Verificação realizada

- Build de produção e verificação TypeScript.
- Testes HTTP/API: autenticação, CSRF, perfis, validação, integridade relacional, mensalidades idempotentes, bloqueio financeiro, pagamento, check-in duplicado, lotação, fichas, avaliações, exportação, senha, persistência após reinício e logout.
- Sem validação visual automatizada em navegador neste ambiente. Não foi feita implantação em um servidor público.

## Licença

MIT. Veja [LICENSE](LICENSE).
