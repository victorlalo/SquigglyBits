Game Concept Summary

Tech Stack
Frontend: TypeScript + PixiJS + Vite
UI: HTML/CSS outside the canvas
Prototype target: Web first for fast iteration and easy sharing
Mobile: Possible later, but not a current focus
Core Game Concept

This is a browser-based asynchronous simulation game built around a daily shared challenge.

Each day, all players start from the exact same simulation conditions:

same jar
same starting creatures
same simulation rules
same seed

Players do not directly control creatures. Instead, they influence the simulation indirectly by tuning a limited number of environmental variables before and during the run.

The simulation then plays out automatically. At the end, the player selects one resulting creature as their champion.

The core fantasy is:

You are not directly building a fighter. You are shaping an ecosystem that produces one.

Social / Daily Hook

The main social hook is that everyone gets the same starting conditions each day, but different player decisions produce different outcomes.

This creates:

fairness
daily replayability
friend comparison
leaderboard potential
strategy discussion

After the simulation ends, each player submits one champion creature into asynchronous competition against other players’ champions from that same daily seed.

The core daily loop is:

receive the shared daily challenge
tune the simulation
watch the run play out
choose a champion creature
compare results against friends and other players

The intended feel is:

procedural
readable
social
competitive
daily
emergent
High-Level Pillars
Shared daily seed: all players begin from the same setup
Indirect control: players influence conditions, not creatures directly
Emergent outcomes: creatures evolve through the simulation
Champion selection: the player chooses the best final creature
Asynchronous competition: champions compete after the run
Social comparison: players compare outcomes, strategies, and champions each day
One-Line Pitch

A daily asynchronous ecosystem game where everyone starts from the same simulation, tunes the environment, and submits the strongest creature their jar produces to compete against other players.