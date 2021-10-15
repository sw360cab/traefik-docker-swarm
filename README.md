# Docker Swarm + Traefik [DEMO]

The purpose of this repository is to provide a demo of `Traefik Proxy` in the `Docker Swarm` environment.

The container images used for this app are:

- `traefik:v2.5`
- `sw360cab/swarm-app:0.1.0`

The latter is a very minimalistic NodeJS-based http server (powered by [Fastify](https://www.fastify.io/ "Fastify, Fast and low overhead web framework, for Node.js")).
It exposes two HTTP endpoints:

- `/`
- `/healthz` (which gives info also on `hostname`)

Both endpoints respond with custom JSON payload.

## Traefik Proxy with Docker Provider (in Swarm)

Traefik Proxy will use `Docker Provider`, using `labels` in Docker Compose.
However specific configuration is needed when dealing with `Docker Swarm`.

`Note`: for sake of simplicity, Traefik Proxy (static) configuration is provided via `File`, instead of `cli` arguments.

1. To enable Docker Swarm (instead of standalone Docker) as a configuration provider, set the `swarmMode` directive to true.

       providers:
        docker:
          exposedByDefault: false
          swarmMode: true

2. Routing Configuration with Labels. In `Swarm Mode`, Traefik Proxy uses `labels` found on `services`, not on individual containers.
Therefore, if you use a compose file with Swarm Mode, labels should be defined in the `deploy` part of your `service` (This behavior is only enabled for docker-compose version 3+).
Port Detection:

       deploy:
         ...
         labels:
           - "traefik.enable=true"
           ...

3. `Docker Swarm` does not provide any port detection information to `Traefik Proxy`
Therefore, you must specify the port to use for communication by using the label `traefik.http.services.<service_name>.loadbalancer.server.port`

       labels:
         ...
         - "traefik.http.services.zservice.loadbalancer.server.port=3000"

`Ref`:

- [Docker Swarm - Traefik](https://doc.traefik.io/traefik/providers/docker/#docker-swarm-mode)
- [Docker Port Detection - Traefik](https://doc.traefik.io/traefik/routing/providers/docker/#port)

## Prerequisites: Build Image, Tag and Push to Registry

When using Docker Swarm images should be present either on a public registry or on a private one.

1. Build Image

       docker build -t <image_name:tag> .

2. Tag Image

       docker tag <image_name:tag> <registry_host>:5000/<userspace?>/<image_name_on_registry:tag>

    **WARNING: NO http scheme before <registry_host> !**

3. Push Image

       docker push <registry_host>:5000/<user_space?>/<image_name_on_registry:tag>

    **WARNING: NO http scheme before <registry_host> !**

4. Cleanup (opt*)

       docker image rmi -f <image_name:tag>
       docker image rmi -f <registry_host>:5000/<user_space?>/<image_name_on_registry:tag>

***Notes***: when `<registry_host>:5000/` is omitted, the image is pushed onto public `Docker Hub`.

### (opt.) Creating a private registry

- Use official Docker Image

      docker run -d -p 5000:5000 --restart=always --name registry registry:2

- Create a folder to persist a volume:

      -v $(PWD)/registry_data:/var/lib/registry

- Login into registry (`default` login is `admin:admin`)

      docker login -u <registry_username> -p <registry_password>  https://<registry_host>:5000

`Ref`:

- [Official Doc for  Docker Registry](https://docs.docker.com/registry/deploying/#copy-an-image-from-docker-hub-to-your-registry)

## Create the Swarm

- Create Swarm in a Master (Manager) node

      docker swarm init

- Join (additional) Worker Node
  - (opt.) get swarm token

        docker swarm join-token worker

  - join

        docker swarm join --token <join_token> <master_node:host>:<master_node:port>

- Leaving the swarm (deleting whole _swarm_, implies removing all nodes, including the manager, which requires _-f_ parameter)

      docker swarm leave -f

## Deploy Stack on Swarm

- Deploy a stack from Compose file

      docker stack deploy --compose-file=docker-compose.yml swarmer

  - Gotchas
    - Compose file version >= 3.0
    - Some compose parameters are unavailable when using swarm. Checkout the [Compose official doc](https://docs.docker.com/compose/compose-file/compose-file-v3/)

- Inspect service within the Swarm

      docker service ls

- Test the services

      curl https://<domain_name>/healthz

  `Note`: answer is served by `Traefik Proxy`, response is load-balanced among all replicas of the service (checkout the `hostname` parameter in the JSON payload, changing for each request)

- (opt.) Remove stack

      docker stack rm swarmer

## Monitoring Nodes in the Swarm

- Check available nodes within the Swarm

      docker node ls

- See whats running on a node

      > docker node ps # on a manager node
      > docker node ps NODE_NAME # name of a worker node, achieved from the output of `docker node ls`, first 3 chars are enough)

## Playing with Swarm `placement` capabilities

- Try to scale beyond node possibilities (note that the command would stack if conditions are not met, even if a node is added to the swarm meanwhile):

    in `compose file`

      placement:
        max_replicas_per_node: 2

    and then

      docker service scale swarmer_app=5

- Force app to be deployed on a worker node (in `compose file`):

      placement:
        constraints:
          - node.role != manager
