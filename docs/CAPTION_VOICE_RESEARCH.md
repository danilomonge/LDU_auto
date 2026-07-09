# LDU caption voice research

Research date: 2026-07-06

Goal: make automated Instagram captions sound like they come from a real LDU fan: warm, specific, sometimes emotional, sometimes demanding, never generic.

## Sources Checked

- FanChants LDU index: confirms common chant titles and identity words such as Albo, Liga, La U, Centrales, Casa Blanca, "mi viejo amigo", "Vamos Albo", "Ole Liga", and "Todas las Campanas".
  https://www.fanchants.com/football-team/liga-deportiva-universitaria-de-quito/
- BarraBrava.net Muerte Blanca index: broad list of LDU chant titles and recurring fan language: alma, corazon, Bajo de Ponciano, desde guambra, no te deje, todas las canchas, volveremos, centrales, carnaval.
  https://barrabrava.net/ldu/muerte-blanca/letras/
- BarraBrava pages for "Somos del bajo de Ponciano", "Todas las canchas donde te segui", "Liga siempre yo te seguire", "Mi corazon", "Soy de Liga desde guambra", and related songs.
- LDU identity/history reference: club nicknames include Rey de Copas, Albos, Merengues, Universitarios, Centrales, La U; Casa Blanca/Rodrigo Paz Delgado is the home stadium.
  https://es.wikipedia.org/wiki/Liga_Deportiva_Universitaria_de_Quito
- El Comercio on Casa Blanca anniversary: reinforces Casa Blanca as a real emotional/historical place for the fanbase.
  https://www.elcomercio.com/deportes/futbol/futbol-casablanca-liga-quito-aniversario/

Note: the implementation should not copy full chant lyrics. It should use short identity fragments and original phrasing inspired by the fan vocabulary.

## Authentic Motifs

Use these as semantic ingredients, not as copied lyrics:

- Old friend / beloved club: "mi viejo amigo", "mi Liga querida", "albo querido".
- Lifelong belonging: "desde guambra", "desde que me acuerdo", "desde siempre".
- Place: Bajo de Ponciano, Ponciano, Casa Blanca, Rodrigo Paz Delgado, Quito.
- Identity: Liga, La U, albo, Rey de Copas, Centrales, camiseta blanca.
- Following: donde juegues, todas las canchas, otra vez contigo, no te dejo.
- Emotion: corazon albo, locura linda, amor que no se explica, alegria, bronca, orgullo.
- Match ritual: hoy juega Liga, volver a la cancha, que ruede la pelota, tarde/noche alba.
- Standards: esta camiseta pesa, Liga exige, jugar con caracter, responder a la historia.
- Good and bad days: en las buenas se disfruta; en las malas se esta, se exige y se vuelve.

## Avoid

- Generic sports copy: "cada partido es una final", "vamos por todo", "con garra y pasion", "a dejarlo todo".
- Corporate voice: "seguimos comprometidos", "objetivo cumplido", "gran desempeno colectivo".
- Toxic rival bait. The source culture has rival language, but this account should sound genuine without insulting.
- Long direct chant quotes. Short fragments are fine when transformed into original captions.
- Too many exclamation marks.
- Forced grandeur after small matches.

## Voice Rules

- Prefer first-person fan feeling over abstract crowd statements.
- Mention Liga naturally; not every line needs "hinchada".
- Let result tone change:
  - Fixture: anticipation, ritual, faith, demand.
  - Win: joy, relief, pride, "esto es Liga".
  - Draw: frustration plus presence; "no alcanza, pero se sigue".
  - Loss: pain plus demand; no empty positivity.
- Keep each generated closer to two or three short lines.
- Make phrases sound typed by a fan after looking at the poster, not written by a marketing team.

## Original Phrase Bank

These are original lines built from the research motifs. They can be mixed in code.

### Core Heart Lines

- Como te quiero, mi viejo amigo.
- Otra vez contigo, Liga querida.
- Mi viejo amigo, hoy volvemos a estar.
- Liga de mi vida, una vez mas.
- Esto de Liga no se explica, se siente.
- Desde guambra con la blanca en el pecho.
- Desde que me acuerdo, siempre Liga.
- Hay amores que no se discuten.
- Mi corazon sabe de que lado esta.
- La U no se suelta nunca.
- Que lindo es volver a pensarte todo el dia.
- Albo querido, aca estamos otra vez.
- Una vida entera aprendiendo a quererte.
- La camiseta blanca no se mira de lejos.
- Con Liga se sufre, se canta y se vuelve.
- No es costumbre: es pertenencia.
- No es solo futbol cuando juega Liga.
- Hay cosas que se heredan sin explicacion.
- Liga es ese amor que vuelve cada semana.
- A veces alegria, a veces bronca, siempre Liga.
- Lo nuestro con Liga viene de lejos.
- Donde este Liga, algo se mueve adentro.
- Esta locura alba no pide permiso.
- La semana cambia cuando juega la U.
- En esta casa se habla en blanco, rojo y azul.

### Fixture Second Lines

- Que ruede la pelota y que hable la camiseta.
- Hoy toca jugar con memoria y presente.
- Ponciano sabe lo que pesa esta camiseta.
- Que la Casa Blanca empuje desde el primer minuto.
- Partido para entrar serios y salir mas albos.
- Hoy no alcanza con estar: toca competir.
- Que se sienta Quito cuando salga Liga.
- Con fe, con cabeza y con el pecho albo.
- A jugar como pide la historia.
- La previa ya se vive con nervios de Liga.
- Que sea una de esas tardes que se quedan.
- La cancha espera, la hinchada tambien.
- Hoy hay que responderle al escudo.
- Que el rival sepa donde esta parado.
- La pelota dira, pero el aliento ya esta.
- A Ponciano se va con fe y exigencia.
- No importa el torneo: importa la camiseta.
- Que sea con caracter, como manda Liga.
- Hoy se vuelve a prender el corazon albo.
- Vamos por otra alegria, sin vender humo.
- Partido a partido, como se vive esto.
- Que Liga haga lo suyo y la gente lo de siempre.
- Desde temprano ya se siente distinto.
- Hoy la blanca tiene que hablar fuerte.
- Que el equipo entre sabiendo lo que representa.

### Win Lines

- Asi se vuelve a casa con el pecho lleno.
- Triunfo de esos que se gritan distinto.
- Tres puntos y una sonrisa bien alba.
- Gano Liga y la semana respira mejor.
- Cuando gana la U, todo pesa menos.
- Esto tambien es Liga: sufrir, empujar, ganar.
- La alegria tiene nombre y juega de blanco.
- Se disfruta, porque tambien costaba.
- Victoria para abrazar al viejo amigo.
- Que lindo dormir con Liga ganando.
- La Casa Blanca sabe celebrar estas noches.
- Tres puntos para seguir creyendo con calma.
- Orgullo albo, sin perder la cabeza.
- Gano Liga y Ponciano lo sabe.
- Hoy la camiseta respondio.
- Una alegria mas para esta locura.
- Se gano como se tenia que ganar.
- Esto se festeja con memoria y humildad.
- Partido trabajado, alegria completa.
- La U hizo lo suyo y el corazon tambien.
- Ganar con Liga nunca se vuelve rutina.
- Que lindo verte ganar, viejo amigo.
- Triunfo para los que siempre estan.
- Otra pagina chica, otro orgullo grande.
- Se festeja porque Liga importa.

### Draw Lines

- No alcanza, pero aca nadie se baja.
- Punto con bronca, camiseta intacta.
- Faltaron detalles; sobro aliento.
- Se suma, se corrige y se vuelve.
- Empatar con Liga deja ganas de mas.
- La exigencia tambien es parte del amor.
- No era lo que queriamos, pero seguimos.
- Hay que mejorar, porque Liga obliga.
- La hinchada acompana, pero tambien exige.
- Punto que sabe a tarea pendiente.
- Queda bronca; queda Liga.
- No se festeja, se analiza y se sigue.
- El viejo amigo merecia mas hoy.
- A levantar la cabeza sin conformarse.
- La camiseta pide otra respuesta.
- Esto no termina aca; Liga nunca se mira de lejos.
- Hoy falto cerrar lo que se peleo.
- La fe sigue, la vara tambien.
- Se vuelve con el alma medio cruzada.
- Hay empates que dejan trabajo para la semana.
- A esta historia se le pide mas.
- No nos vamos felices, nos vamos presentes.
- El camino sigue y la exigencia tambien.
- Cuando no alcanza, toca hablar en la cancha.
- Liga merece mas, y por eso duele.

### Loss Lines

- Duele porque Liga importa.
- Hoy pesa, manana se vuelve.
- Se acompana, pero se exige.
- La camiseta no permite acostumbrarse a perder.
- Bronca alba, amor intacto.
- A Liga no se la deja en una mala noche.
- Perder con esta camiseta siempre tiene que doler.
- Toca mirarse de frente y responder.
- No hay frase linda para esto: hay que mejorar.
- La hinchada esta, la respuesta tiene que venir.
- Viejo amigo, hoy duele; igual aca estamos.
- La historia pide reaccion.
- Esto se levanta jugando, no hablando.
- En las malas tambien se demuestra quien esta.
- No se abandona, pero tampoco se tapa.
- A corregir rapido, porque Liga exige.
- La bronca tambien es amor por la camiseta.
- Que este golpe sirva para despertar.
- Hoy nos vamos golpeados, no ausentes.
- La U merece una respuesta a la altura.
- Cuando Liga cae, el pecho queda pesado.
- No se negocia el apoyo; tampoco la exigencia.
- Otra vez tocara volver y empujar.
- Hay derrotas que solo se curan respondiendo.
- Que duela, y que se note en el proximo.

### Place And History Lines

- Ponciano no es cualquier cancha.
- La Casa Blanca tiene memoria.
- Quito sabe cuando juega Liga.
- El Rey de Copas no vive de apodos; los defiende.
- Esta camiseta se hizo grande con noches asi.
- En Ponciano se aprende a querer distinto.
- La U tiene historia y la historia exige.
- La blanca pesa porque atras hay vida.
- La casona guarda alegrias que no se olvidan.
- Ser albo tambien es saber esperar.
- Centrales de nombre, albos de corazon.
- Liga no necesita gritar para pesar.
- El escudo ya habla antes del pitazo.
- Cada partido trae su propio nudo en la garganta.
- La historia no entra a la cancha, pero empuja.

## Combination Strategy

Generate captions from two independent lines:

- Line 1: heart/identity line.
- Line 2: status-specific line.
- Optional line 3 for some fixtures/results: place/history line.

With 25 core heart lines, 25 lines per state, and 15 place/history lines, each state can produce thousands of valid combinations. The generator should choose deterministically from match id, post type, outcome, and competition type so reruns stay stable.

Suggested minimum implementation target:

- Fixture: 25 heart x 25 fixture x 15 optional place variants = 9,375 possible closers.
- Win: 25 heart x 25 win x 15 optional place variants = 9,375.
- Draw: 25 heart x 25 draw x 15 optional place variants = 9,375.
- Loss: 25 heart x 25 loss x 15 optional place variants = 9,375.

Total practical space: 37,500+ possible closer combinations before considering competition-specific hashtags or home/away phrasing.

## Test Expectations

- Generated caption closer must include an LDU-specific identity marker.
- Fixture/result banks should expose at least 5,000 unique closers per bucket;
  standings should expose at least 3,000.
- No banned generic phrases.
- No profanity or direct rival insults.
- Generated line length should stay readable on Instagram.
- Deterministic generation must be preserved.
