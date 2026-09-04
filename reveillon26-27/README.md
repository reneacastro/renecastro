# Réveillon 2026 › 2027

One page de decisão do grupo: comparativo das casas candidatas + votação.
Publicada em **https://renecastro.com.br/reveillon26-27/**

## Como adicionar uma casa nova

Tudo vem de `js/dados.js`. Copie um objeto de `DADOS.casas`, troque os campos e
publique — a página se ajusta sozinha: cards, comparativo, opções de voto,
callout de lotação e cálculo por pessoa.

Campos obrigatórios de uma casa:

| campo | o que é |
|---|---|
| `id` | slug único (vira o âncora `#casa-<id>`) |
| `apelido` | nome curto usado no comparativo e na votação |
| `titulo`, `url` | título e link do anúncio |
| `local` | `{cidade, uf, lat, lng, detalhe}` |
| `datas` | `{checkin, checkout, noites}` — datas em ISO `YYYY-MM-DD` |
| `preco` | `{total, porNoite, taxas, cancelamento}` + `nota` opcional |
| `capacidade` | `{maxHospedes, quartos, camas, banheiros}` — `banheiros: null` se o anúncio não informar |
| `distancia` | `{km, min}` a partir de São Caetano do Sul |
| `rating`, `anfitriao`, `destaquesAirbnb`, `descricao` | vêm do anúncio |
| `fotos` | `[{u: url, t: [tags], o: orientação}]` |
| `comodidades`, `naoTem`, `quartos`, `regras`, `avaliacoes` | idem |

Numa avaliação, `"flag": "atencao"` destaca o comentário em amarelo — use para
ressalvas que o grupo precisa ver.

Os **pontos de atenção** de cada card são derivados por regra (lotação menor que
o grupo, menos camas que gente, banheiro não informado, proibição de festa,
horário de silêncio, falta de detector de fumaça, ressalvas nas avaliações).
Casa nova entra já com essa análise, sem código extra.

## Ligar a votação compartilhada

Enquanto `window.CONFIG.firebase` for `null` (em `js/config.js`), cada voto fica
só no navegador de quem votou e a página avisa "rascunho local".

Para ligar de verdade — grátis, plano Spark, sem cartão:

1. console.firebase.google.com → **Adicionar projeto**
2. Build → **Realtime Database** → Criar banco → modo de teste
3. Configurações do projeto → Seus apps → **Web (`</>`)** → copiar o objeto de config
4. Colar em `js/config.js` e publicar

As regras do banco em modo de teste expiram em 30 dias. Para durar até a viagem,
troque por:

```json
{ "rules": { "reveillon-2026-2027": { ".read": true, ".write": true } } }
```

## Fotos de perfil

A página procura `fotos/<slug>.jpg` para cada pessoa (o `slug` está em
`DADOS.pessoas`). Se o arquivo não existir, ela usa um avatar com a inicial e uma
cor estável por nome. É só jogar os arquivos na pasta — nenhum código muda.
