# Rexus [![GitHub license](https://img.shields.io/github/license/Wave-Play/rexus?style=flat)](https://github.com/Wave-Play/rexus/blob/main/LICENSE) [![Tests](https://github.com/Wave-Play/rexus/workflows/CI/badge.svg)](https://github.com/Wave-Play/rexus/actions) ![npm](https://img.shields.io/npm/v/@waveplay/rexus) [![minizipped size](https://badgen.net/bundlephobia/minzip/@waveplay/rexus)](https://bundlephobia.com/result?p=@waveplay/rexus)

Rexus is Nexus' bestie.

It allows for the separation of resolver definitions vs implementations.
This unlocks the ability to generate schemas without building the entire project.
With Docker, this can be a massive improvement as it allows for layer caching & parallel builds.

As a bonus, it enables resolvers to call one another within the same shared context!
The downsides? Well, additional overhead for one. Types are also lost with Rexus... for now.
