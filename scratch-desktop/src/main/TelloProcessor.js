const dgram = require('dgram');

const telloAddress = '192.168.10.1';
const serverPort = 8890;
const clientPort = 8889;

class TelloProcessor {
    initialize () {
        this.queue = []; // command queue
        this.data = {};

        this.client = dgram.createSocket('udp4');
        this.server = dgram.createSocket('udp4');

        this.client.bind({
            address: '0.0.0.0',
            port: clientPort
        });

        this.server.bind({
            address: '0.0.0.0',
            port: serverPort
        });

        this.send('command');
        this.executing = true;

        this.client.on('message', (message, remote) => {
            const readableMessage = message.toString();
            // Previous command executed
            if (readableMessage === 'error' || readableMessage === 'ok') {
                this.executing = false;

                // Dequeue
                this.queue.shift();

                // Send the next element
                this.inquire();
            }
        });

        // Tello State
        this.server.on('message', (message, remote) => {
            // remote: { address: '192.168.10.1', family: 'IPv4', port: 8889, size: 127 }
            // message: <Buffer 70 69 74 63 68 ... >
            const readableMessage = message.toString();
            // console.log(readableMessage);
            for (const e of readableMessage.slice(0, -1).split(';')) {
                this.data[e.split(':')[0]] = e.split(':')[1];
            }
        });

        this.server.send('battery?', 0, 'battery?'.length, clientPort, telloAddress, (err, bytes) => {
            if (err) throw err;
        });
    }
    

    request (cmd) {
        // Enqueue
        this.queue.push(cmd);

        this.inquire();
    }

    state () {
        return this.data;
    }

    // If executing command is nothing and waiting queue has some element, send first command to Tello
    inquire () {
        if (!this.executing && this.queue.length > 0) {
            this.send(this.queue[0]);
        }
    }

    send (cmd) {
        const msg = Buffer.from(cmd);
        this.executing = true;
        this.client.send(msg, 0, msg.length, clientPort, telloAddress, (err, bytes) => {
            if (err) throw err;
        });
    }
}

export default TelloProcessor;
