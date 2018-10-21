# nvivn

🚨 Warning: early and experimental 🚨

More at [nvivn.io](https://nvivn.io). Here's an early [demo video](https://nvivn.io/nvivn-demo.mp4) if you're into that sort of thing.

## Installation

    npm install
    npm link
    
## Dependencies
On fresh Ubuntu 18 you may need to install dependencies first:

sudo apt-get install npm
sudo apt-get install libtool
sudo apt-get install libtool
sudo apt-get install autoconf

You can safely ignore the fsevents incompatibility warning

## Running

Now you can run `nvivn server` in whatever directory you like. It'll start up at http://localhost:9999.

## Web UI

There's a separate web UI that you can build and run by running:

    npm run web

You can view that at http://localhost:9966

## What?

So both the server and the web UI create an instance called a hub. A hub has an identity (automatically created on first launch) and a message log. The server version is nearly identical, except that it writes messages to the file system, and can discover peers on the local network using zeroconf/mdns.

## Commands

All actions are triggered via commands. Some examples:

- `op:messages` lists all messages
- `op:messages text:hi` lists all messages where text is "hi"
- `op:messages since:now-15m` lists all messages that this hub has gotten in the last 15 minutes (can also be a Unix epoch time, or anything elastic search's [date math syntax](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-date-format.html#date-math) handles)
- `op:create-message | text:stuff anotherthing:"whatever you want"` creates a new message
- `op:peers` lists known peer hubs

These can be executed locally with `nvivn <command>` in the working directory of your hub, whether or not the server is running. (Those commands operate directly on the files.)

In the web UI, you can use these commands, as well as a few extras:

- `:whoami` will print your current identity information
- `:hub` will print your current hub
- `:set-hub | "some-server:port"` will switch to a new hub

You can also use any of the command line commands. (The "op:" prefix is optional.)
