const querystring = require('querystring');
const https = require('https');
const CronJob = require('cron').CronJob;
const cronExpression = '0,15,30,45 * * * *';

function requestAlertDraft(draft) {
    return new Promise((resolve, reject) => {
      const req = https.request(draft, res => {
        res.setEncoding('utf8');
        let buffer = '';
        res.on('data', function(data) {
          buffer += data;
        });
        res.on('end', function() {
          if (res.statusCode >= 300) {
            let message;
            let data;

            try {
              data = JSON.parse(buffer);
              message = data
            } catch(e) {
              message = buffer;
            }

            console.error('ERROR!', res.statusCode, message);
            const error = new Error(message.error)
            error.statusCode = res.statusCode;
            return reject(error);
          }

          let data;
          try {
            data = JSON.parse(buffer);
          } catch (err) {
            console.error('JSON ERROR!', buffer);
            return reject(new Error('Json error'));
          }

          resolve(data);
        });
      });

      req.on('error', err => {
        reject(err);
      });

      req.on('socket', socket => {
        if(socket.connecting) {
          socket.setNoDelay(true);
          socket.setTimeout(draft.timeout);
          socket.on('timeout', function() {
            req.abort();
          });
        }
      });

      req.end(draft.payload);
    });
  }

const tracking = async () => {
	
	let tokenID='0x07663837218a003e66310a01596af4bf4e44623d'; //rUSD token
	// create the draft before hand
	const draftQuote = {
	  host: 'api.pancakeswap.info',
	  path: '/api/v2/tokens/' + tokenID,
	  method: 'GET',
	  timeout: 90000
	};

	
	let dataPrice = await requestAlertDraft(draftQuote);
	let tokenName = dataPrice.data.name;
	let tokenPrice = Math.floor(dataPrice.data.price * 1000)/1000 ;
	console.log(tokenName + " Price : " + tokenPrice);
	
	if (tokenPrice <0.95) {// criteria matched to send
		let message = querystring.escape(tokenName + " Price : " + tokenPrice)
		const draftNotification = {
		  host: 'notify-api.line.me',
		  path: '/api/notify?message=' + message,
		  method: 'POST',
		  headers: {
			'Authorization': 'Bearer <your line notify access token>',
			'content-type' : 'application/x-www-form-urlencoded'        
		  },
		  timeout: 90000
		};
		let dataNotification = await requestAlertDraft(draftNotification);
		//console.log("Alert Sent");
	}
} 

const job = new CronJob(cronExpression, function () {
  tracking()
})

job.start()

tracking();
