# Marca Scientia — guia rápido

Símbolo: S em traço contínuo com nós (terminais grafite, centro teal #09D0C9).
Fonte do wordmark: **Albert Sans** semibold (600), letter-spacing -0.01em.
Tagline: Albert Sans 500, letter-spacing 0.04em, cor #5d6779.

## Cores
- Grafite (traço/texto): #1b2331
- Teal (nó central, acento): #09D0C9
- Off-white (fundo / versão clara): #f3f5fa
- Azuis de apoio (gradiente do login): #163a70 → #0d264b

## Arquivos (assets/)
- scientia-simbolo.svg / scientia-simbolo-claro.svg — símbolo solto, vetor
- favicon.svg + favicon-16/32/48/180/512.png — símbolo claro em contêiner grafite, raio 23%
- simbolo-512.png — símbolo escuro em PNG
- lockup-horizontal(.png / -simples / -escuro) — símbolo + nome (+ tagline), 4x
- lockup-vertical(.png / -escuro)

## Regras
- Contêiner só no favicon; nos demais usos o símbolo é solto.
- Redução mínima do lockup: símbolo a 20px; abaixo disso, use só o símbolo.
- Monocromático: tudo em #1b2331 (ou #f3f5fa no escuro), nó central incluído.
- Nunca mais de duas cores, sem degradê ou sombra no símbolo.

## HTML do favicon
```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/favicon-180.png">
```
