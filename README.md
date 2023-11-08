# distri-lru-server

Redis client server for `distri-lru` npm library

## Setup

1. Install Redis on machine
2. Install Node.JS 16
1. `yarn install`
2. `yarn build`
3. Set environment variables:
```
# The port this will be accessed from
PUBLIC_PORT=4800
# The port of the locally running Redis server
REDIS_PORT=6379
# Cache prefix. Should be unique.
CACHE_PREFIX=a
# The Redis broker for pub/sub
BROKER_HOST=127.0.0.1
BROKER_PORT=4100
```
4. `yarn start`

## Usage

This should be running on each machine that will act as one of the 'nodes' for the geo-distributed cache

Each machine needs a running redis instance, with port `REDIS_PORT`

There needs to be one additional redis server that just acts as a pub/sub broker.
<br />
This needs to be at `BROKER_HOST:BROKER_PORT`