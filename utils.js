
const sumAll = (data) => {
    // get sum of msgCount prop across all objects in array
  let connectedClients = data.reduce(function(prev, cur) {
	  return prev + parseInt(cur.connectedClients);
  }, 0);
  return {connectedClients : connectedClients, 'count':data.length};
};