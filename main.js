const http = require('http')
const axios = require("axios");
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const myport = 9001
const myip = '10.50.11.160'
const iptable_command = "kubectl get  pod  -n dojot -o wide"

// global makes me sad
let responses = {};
let server;

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }

const httpClient = axios.create();
httpClient.defaults.timeout = 3000;

const getData = async url => {
  try {
    const response = await httpClient.get(url);
    const data = response.data;
    return data;
  } catch (error) {
      return {'error': true, 'connectedClients' : 0 };
  }
};


async function getIps(){
    let ips = [];
    const command = iptable_command+" | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}'";
    console.log("Get IP with command: ", String(command));

    //let command = 'ifconfig | grep -oE "([0-9]{1,3}\.){3}[0-9]{1,3}"';
    const { stdout } = await exec(String(command));
    // the *entire* stdout and stderr (buffered)
    stdout.split(/\r?\n/).forEach(element => {
        if (element && element.split('.').length === 4)
            ips.push(element);
    });
    return ips;
};

const fetchAsychData = async (arry) => {
    console.log("Fetching asynchronous data.");
    const data = {}, datavet = [];
    await asyncForEach(arry, async (ip) => {
      const url = 'http://'+ip+':10001/iotagent-mqtt/metrics';
      data[ip] = await getData(url);
      datavet.push(data[ip]);
    });
    return {data, datavet};
}


async function updateData(ips){
    
    let { data, datavet } = await fetchAsychData(ips);
    datavet.all = responses;

    responses = creatingEndpoints(ips, data);
    responses['/'] = JSON.stringify(sumAll(datavet));
    console.log("Endpoints availables: ", responses);
}

returnRequest = (req) => {
  return responses[req];
}


function creatingServer(){
    server = http.createServer((req, res) => {
        res.end(returnRequest(req.url));
        })

    server.listen(myport, myip, () => {
        console.log(`Server running at http://${myip}:${myport}`)
    })
};

const sumAll = (data) => {
    // get sum of msgCount prop across all objects in array
  let connectedClients = data.reduce(function(prev, cur) {
	  return prev + parseInt(cur.connectedClients);
  }, 0);
  return {connectedClients : connectedClients, 'count':data.length};
};

const creatingEndpoints = (ips, data) => {
    let responses = {}, index = 1;
    ips.forEach(ip => {
	responses['/'+index] = JSON.stringify(data[ip]);
        index++;
    });
    return responses;
}

async function main()
{
    console.log("Initializing");
    let ips = await getIps();
    console.log(ips);

    creatingServer();

    setInterval(function () {
        console.log('Updating data...'); 
        updateData(ips);
    }, 1000); 
}

main();
