# Carla: integração dos roteiros aprovados

## Entrega

Integração **textual e local**, baseada no commit `5e50fccc955af2d273f6c54668921c37e94a12c9`. Não houve geração de voz, contratação, upload de áudio, migração de banco, push ou publicação.

O pacote editorial contém 117 falas e 10.119 caracteres:

- Colorir e Descobrir: oito temas, 57 falas, 4.194 caracteres. Acolhimento, descobertas diferentes para 2–3 e 4–5 anos, sons e letra inicial opcionais apenas para 4–5, contagem do número três e orientações de pintura/observação.
- Jogos: dez atividades reais, uma por motor, 60 falas e 5.925 caracteres. Entrada, ajuda, conclusão, proposta específica, dica e explicação do exemplo aprovado.

As falas dos jogos **não são aplicadas às outras 379 atividades**. Algumas dependem do conteúdo escolhido: memória de figuras iguais não serve automaticamente à memória relacional; a conclusão sobre sons não serve a qualquer atividade de completar. O restante do catálogo conserva seu comportamento e seus textos anteriores.

## Proteções

- As instruções operacionais existentes, inclusive teclado, continuam intactas. Os jogos contemplados ganham uma seção recolhível de apoio. Não foram alterados respostas, pontuação, embaralhamento, temporizadores, progressão ou conclusão dos motores.
- Nos jogos, todo o conteúdo validado, com imagens resolvidas, precisa corresponder ao SHA-256 editorial. Mesmo uma cópia com o mesmo ID e título alterado não recebe o roteiro. Atividades sem vínculo não exibem a seção.
- Quiz e trilha exibem a explicação apenas após uma tentativa respondida pelo motor, inclusive o retorno de tentativa incorreta que já permite revisão. Ao voltar para tentar, a pergunta reaparece; ao avançar, não permanece a proposta da questão anterior. A explicação já explorada fica disponível para consulta.
- Associação, memória, classificação, caça-palavras, cruzadinha e completar exigem que o motor tenha registrado o item do exemplo como resolvido. Sequência e quebra-cabeça exigem conclusão. A dica da memória depende de haver carta aberta.
- Colorir usa o roteiro aprovado somente quando ID, catálogo, revisão e hash correspondem à origem aprovada. A validação criptográfica do snapshot institucional permanece anterior à exibição. Cópias alteradas conservam seu próprio roteiro.
- A contagem continua aceitando as estrelas em qualquer ordem, uma única vez cada, sem apagar a pintura ao reiniciar. A descrição da cena distingue pintura presente, desenho vazio e pintura apagada/desfeita.
- Sons/letras continuam opcionais e não aparecem para 2–3 anos. O desenho sem pintura pode ganhar vida. Movimento reduzido, pausar, voltar, observação sem resposta e controles de teclado existentes foram preservados.
- Carla aparece como voz escolhida, mas os controles de ouvir continuam desabilitados. `audio.files` é `null`, a licença permanece pendente e o contrato de áudio institucional não foi modificado. Não há chamadas a ElevenLabs, microfone, reconhecimento de fala ou síntese do navegador.
- A música de fundo já existente pode carregar metadados de arquivos locais. Nos testes continuou pausada. Isso é distinto de narração, que não foi requisitada.
- Catálogos, artes, snapshots, permissões, login, sessão compartilhada, biblioteca/leitor e dados escolares não foram modificados.

## Arquivos

- `mission-runtime/narration/approved-copy.mjs`: textos editoriais congelados, vínculo com conteúdo e metadados de licença pendente.
- `resolve.mjs`: resolução por versão, verificação de conteúdo e seleção de texto conforme estado, sem alterar os motores.
- `game-guidance.mjs` e `guidance.css`: apresentação usando a mesma instância de React já carregada pelo Studio.
- `mission-runtime/coloring/app.mjs`: integração do roteiro nos controles existentes. `narrator.mjs`: somente a mensagem de falha aprovada; as barreiras de licença não mudaram.
- `editorial/`: campos editoriais copiados dos roteiros aprovados, sem alterar suas falas. São a entrada reproduzível do compilador; notas antigas de estágio não são usadas como estado atual do produto.
- `bindings.json`: hashes dos dez conteúdos efetivamente carregados pelo runtime.
- `player-hook.json`: duas inserções de apresentação e seus hashes de entrada/saída. O teste reverte essas inserções em memória e confere os bytes originais.

O Player entregue atualmente é um bundle. A árvore de código-fonte local encontrada não reproduz exatamente os patches institucionais deste bundle. Por isso a alteração é pequena, explícita, reversível e guardada por hash, em vez de reconstruir e substituir o Studio inteiro. Uma futura reconstrução do Player deve portar o componente para o fonte correspondente, preservar os patches institucionais e recapturar os vínculos. O script recusa um Player de base diferente.

## Reprodução e verificação

Node 24; Chrome isolado, sem perfil pessoal; Playwright já instalado localmente. Para os testes de navegador, definir `PLAYWRIGHT_MODULE` para o módulo Playwright disponível e `CHROMIUM_PATH` para o Chrome. Os servidores de teste aceitam apenas loopback e não consultam produção.

```sh
node scripts/prepare-carla-copy.mjs qa/carla-guidance/editorial
node scripts/apply-carla-player-hook.mjs
node --test tests/carla-guidance/unit.mjs tests/mission-institutional/unit.mjs \
  tests/app-web/edition-library.test.mjs tests/app-web/hosting-target.test.mjs \
  tests/app-web/login-return.test.mjs tests/app-web/runtime-overrides.test.mjs \
  tests/app-web/validation-artifact.test.mjs tests/app-web/web-session.test.mjs
node tests/carla-guidance/engine-gates.mjs
node tests/carla-guidance/browser.mjs
node mission-runtime/tests/runtime-isolation.mjs
node tests/mission-institutional/browser.mjs
node scripts/build-static-web.mjs
```

Ao revisar intencionalmente o conteúdo ou o runtime, atualizar os hashes dos arquivos alterados nos manifestos, sem modificar os hashes das fontes originais. O build verifica todos os bytes antes de preparar a saída. Os quatro novos módulos de narração estão no manifesto de runtime; roteiros de origem, testes e evidências não são publicados.

## Evidências e limites

- `evidence/unit.log`: 92 testes passando, zero falhas. Inclui vínculo editorial, estados, segurança de áudio, pintura, integridade das fontes, contratos institucionais, retorno de login, sessão e manifestos.
- `evidence/engine-gates.json`: dez motores reais. Os testes extraem suas funções exatas para um módulo servido somente no harness e exercitam respostas incorretas, respostas resolvidas, progressão e conclusão. Não há hook de teste entregue ao produto nem relaxamento da CSP.
- `evidence/report.json`: abertura das dez atividades aprovadas, 16 combinações de Colorir e idade, transição real do quiz, cópia docente alterada, atividade fora da seleção, redução de movimento, teclado e ausência de chamadas de narração ou serviços externos.
- `evidence/runtime-isolation.log`: edição própria, confirmação assíncrona de salvamento, recusa de confirmação errada, erro de salvamento, restauração de pintura, bloqueio de seleção e rejeição de snapshot adulterado.
- `evidence/institutional-browser-report.json`: regressão institucional com dados sintéticos em desktop e celular. Inclui turmas, publicação simulada, cancelamento/revogação, identidade, rascunhos, pintura, galeria, faixas etárias e quatro jogos legados preservados.
- `evidence/build.log`: 5.563 arquivos verificados no pacote estático, testes e documentos excluídos.
- Capturas em 1.280 px e 390 px registram a revisão visual. No celular os jogos mantêm a região de instruções rolável existente; a seção de apoio abre pelo teclado e seu texto pode ser percorrido nessa região.

A verificação é local e sintética. Não substitui escuta pedagógica da futura gravação, homologação com professores/crianças, navegação autenticada em produção ou testes em dispositivos físicos/Safari/VoiceOver. A expansão para os demais jogos exige novos textos e vínculos revisados. A ativação de áudio exige confirmação da assinatura/licença comercial, nova geração licenciada e testes próprios de pausa, interrupção, volume, música e acesso sem áudio. Nenhuma amostra gratuita foi incorporada.
