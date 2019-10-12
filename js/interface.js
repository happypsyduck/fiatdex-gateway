// Code that runs the client side based FiatDex gateway

var detectMetamask = false; // Default value is that metamask is not on the system
var metamaskConnected = false;
var userAddress = "";
var contractAddress = "0x2C110867CA90e43D372C1C2E92990B00EA32818b";
var myTradeID = "";
var page = 1; // Page can be sending or receiving
var targetNetwork = "1";
var statusChanged = false;

// Contract function keccak hashes
var contract_viewSwap = "16facc88";
var contract_openSwap = "2306f36c";
var contract_addFiatTraderCollateral = "c6228485";
var contract_refundSwap = "fe2510ee";
var contract_closeSwap = "5c614552";

// Javascript functions for the marketplace
var marketplace_url = "http://happypsyduck.mywebcommunity.org/interface/"; // This is the address to the database that stores the market offers (can be changed)

$( document ).ready(function() {
    // This is ran when the page has fully loaded
    checkMetaMaskExist();
    $("#contract_id").html(contractAddress);
    window.setTimeout(checkTradeID,1000);
    window.setTimeout(forceStatusCheck,15000);

    //Also check for marketplace offers
    setupCORSProxy();
    getOpenOffers(0,0);
    getOpenOffers(1,0);
});

function checkMetaMaskExist(){
	// This function checks if MetaMask is installed or not on the browser
	if (typeof window.ethereum !== 'undefined') {
		// Web3 exists, detect if metamask
		if(ethereum.isMetaMask == true){
			detectMetamask = true;
			$("#metamask_text").html("Connect MetaMask Wallet");
		}
	}
}

function metamaskButtonClick(){
	// Based on whether metamask is available or not, the button click will vary
	if(detectMetamask == false){
		var win = window.open('https://metamask.io/', '_blank');
	}else if(detectMetamask == true && metamaskConnected == false){
		// Try to connect to MetaMask
		ethereum.enable()
		// Remember to handle the case they reject the request:
		.catch(function (reason) {
			console.log(reason);
		})
		.then(function (accounts) {
			if (ethereum.networkVersion !== targetNetwork) {
				// Not equal to the mainnet, let user know to switch
				alert('This application requires the main network, please switch it in your MetaMask UI.')
			}
			userAddress = accounts[0]; // We have an account now (ETH address)
			metamaskConnected = true;
			$("#metamask_text").html("MetaMask Connected");
			ethereum.on('accountsChanged', function (accounts) {
				userAddress = accounts[0]; // Update the userAddress when the account changes
			})
		})
	}
}

function togglePage(_page){
	if(_page == 1){
		$("#send_eth_button").css("background","linear-gradient(to bottom, #BEFF79 0%, #92FF1D 33%, #69CA00 100%)");
		$("#get_eth_button").css("background","linear-gradient(to bottom, #B4B4B4 0%, #9A9A9A 100%)");
		$("#send_eth_tradebox").show();
		$("#get_eth_tradebox").hide();
	}else if(_page == 2){
		$("#get_eth_button").css("background","linear-gradient(to bottom, #BEFF79 0%, #92FF1D 33%, #69CA00 100%)");
		$("#send_eth_button").css("background","linear-gradient(to bottom, #B4B4B4 0%, #9A9A9A 100%)");
		$("#get_eth_tradebox").show();
		$("#send_eth_tradebox").hide();
	}
	$("#get_eth_actions").hide();	
	$("#send_eth_amount").hide();
	$("#send_eth_actions").hide();
	$("#trade_status_window").hide();
	$("#loading_status_window").show();
	myTradeID = "";
	page = _page;
}

function generateID(){
	// This function makes a new tradeID with 64 chars
	var hexid = "";
	for (var i = 0; i < 32; i++){
		var number = Math.floor(Math.random() * 256);
		var hex = new BigNumber(number);
		hexid += padleftzero(hex.toString(16),2);
	}
	$("#send_eth_id").val(hexid);
}

function padleftzero(str, max){
  str = str.toString();
  return str.length < max ? padleftzero("0" + str, max) : str;
}

function padrightzero(str, max){
  str = str.toString();
  return str.length < max ? padrightzero(str + "0", max) : str;
}

function checkHex(hex_string){
	// Returns true if string is hex formatted and right length
	var length = hex_string.length;
	if(length > 64){
		return false;
	}
    for (var i = 0; i < length; i++){
      if (isNaN(parseInt(hex_string.charAt(i), 16))){
      	return false;
      }
    }
}

function calculateCollateral(){
	var amount = new BigNumber($("#send_eth_amount_input").val());
	if(amount.isNaN() == true){
		$("#send_eth_collateral").html("0");
		return;
	}
	var collateral = amount.multipliedBy(1.5); // Collateral ratio
	$("#send_eth_collateral").html(collateral.toString(10));
}

function forceStatusCheck(){
	// This function forces to check the blockchain for updates every 15 seconds
	window.setTimeout(forceStatusCheck,15000);
	statusChanged = true;
}

function checkTradeID(){
	var return_early = false;
	if(metamaskConnected == false){return_early = true;}	
	var tradeID = "";
	if(page == 1){
		tradeID = $("#send_eth_id").val();
	}else{
		tradeID = $("#get_eth_id").val();
	}
	if(tradeID.length == 0){return_early = true;}
	if(checkHex(tradeID) == false){return_early = true;} // Not a Hex formatted ID

	if(return_early == true){
		window.setTimeout(checkTradeID,1000);
		return;
	}

	if(tradeID.length < 64){
		tradeID = padrightzero(tradeID,64); // Fill in Zeros to match Ethereum formatting
	}

	if(myTradeID != tradeID || statusChanged == true){
		myTradeID = tradeID;
		statusChanged = false; // We can force an update
		// There is new information, ping the ETH blockchain

		const callParameters = [{
		  to: contractAddress,
		  data: '0x'+contract_viewSwap+myTradeID
		},"latest"];

		//Get data from blockchain
		ethereum.sendAsync({
		  method: 'eth_call',
		  params: callParameters,
		  id: "1",
		  jsonrpc: "2.0"
		}, function (err, result) {
			if(!err){
				if(!result["error"]){
					var trade_data = result["result"].substring(2); // Remove the 0x

					// Break down the trade data
					var trade_status = new BigNumber('0x'+trade_data.substring(0,64));
					var send_amount = new BigNumber('0x'+trade_data.substring(64,64*2));
					var eth_trader = trade_data.substring(64*2,64*3).toLowerCase();
					var fiat_trader = trade_data.substring(64*3,64*4).toLowerCase();
					var open_time = new BigNumber('0x'+trade_data.substring(64*4,64*5));
					var eth_trader_col = new BigNumber('0x'+trade_data.substring(64*5,64*6));
					var fiat_trader_col = new BigNumber('0x'+trade_data.substring(64*6,64*7));
					var fee_amount = new BigNumber('0x'+trade_data.substring(64*7,64*8));

					// Based on the trade status, adjust what the traders see

					// Reset default views
					$("#refund_button").hide();
					$("#open_swap_button").hide();
					$("#fiat_received_button").hide();
					$("#fiat_col_button").hide();
					$("#send_eth_actions").hide();
					$("#send_eth_amount").hide();
					$("#get_eth_actions").hide();
					$("#loading_status_window").hide();
					$("#trade_status_window").show();
					$("#fee_status").hide();
					$("#open_time").html("N/A");
					$("#trade_amount").html("N/A");
					$("#eth_collateral").html("N/A");
					$("#trade_fee").html("N/A");

					if(trade_status == 0){
						// Swap position not open, eth trader can open it
						if(page == 1){
							$("#trade_status").html("Trade ID available for use");
							$("#send_eth_amount").show();
							$("#send_eth_actions").show();
							$("#open_swap_button").show();							
						}else if(page == 2){
							$("#trade_status").html("Trade ID not opened yet, check with your counterparty");
						}

					}else{
						// Trade is at least open, calculate eth amounts
						var divfactor = new BigNumber('1000000000000000000'); // Divide factor to get ETH
						var send_eth = send_amount.div(divfactor);
						var eth_col1 = eth_trader_col.div(divfactor);
						var eth_col2 = fiat_trader_col.div(divfactor);
						var eth_fee = fee_amount.div(divfactor);
						var formatted_userAddress = padleftzero(userAddress.substring(2),64).toLowerCase(); // Match case as well

						// Check to make sure I am involved in this trade
						var myTrade = true;
						if(page == 1){
							if(formatted_userAddress != eth_trader){
								myTrade = false;
							}
						}else if(page == 2){
							if(formatted_userAddress != fiat_trader){
								myTrade = false;
							}							
						}

						if(myTrade == true){
							if(trade_status == 1){
								// Swap position is open, waiting for eth from fiat trader							
								if(page == 1){
									$("#trade_status").html("Waiting for counterparty's ETH collateral");
									$("#send_eth_actions").show();
									$("#refund_button").show();				
								}else if(page == 2){
									$("#trade_status").html("Waiting for your ETH collateral");
									$("#get_eth_actions").show();
									$("#fiat_col_button").show();
									$("#get_eth_collateral").html(eth_col1.toString(10));
								}								
							}else if(trade_status == 2){
								// Swap position is active, cannot refund, can only close
								if(page == 1){
									$("#trade_status").html("Waiting to receive Fiat currency from counterparty");
									$("#send_eth_actions").show();
									$("#fiat_received_button").show();				
								}else if(page == 2){
									$("#trade_status").html("Counterparty is waiting to receive your Fiat currency");
								}
							}else if(trade_status == 3){
								if(eth_col2 > 0){
									$("#trade_status").html("Fiat was received. Trade complete.");
								}else{
									$("#trade_status").html("Trade was canceled by ETH trader");
								}
								$("#fee_status").show();
								if(eth_fee > 0){
									$("#trade_fee").html(eth_fee.toString(10)+" ETH");
								}else{
									$("#trade_fee").html("No Fee");
								}
							}

							// Will return the date as local time
							var cTime = new Date(parseInt(open_time) * 1000);
							$("#open_time").html(""+cTime);
							$("#trade_amount").html(send_eth.toString(10)+" ETH");
							$("#eth_collateral").html(eth_col1.toString(10)+" ETH");
						}else{
							if(page == 1){
								$("#trade_status").html("You are not the ETH trader in this trade");
							}else if(page == 2){
								$("#trade_status").html("You are not the Fiat trader in this trade");
							}
							
						}
					}


				}else{
					console.log("RPC error: "+result["error"]);
				}
			}else{
				console.log("An error occurred while pinging blockchain");
			}
			window.setTimeout(checkTradeID,1000);
		});
	}else{
		window.setTimeout(checkTradeID,1000);
	}

}

function tryOpenSwap(){
	// Eth trader is opening the swap, will prompt metamask to check transaction
	var sendamount_eth = new BigNumber($("#send_eth_amount_input").val());
	var collateral_eth = sendamount_eth.multipliedBy(1.5);
	sendamount_eth = sendamount_eth.plus(collateral_eth); // We are sending the collateral with the sendamount

	var sendamount_wei = sendamount_eth.multipliedBy("1000000000000000000"); // Get as wei
	if(sendamount_wei == 0){return;}

	var fiat_address = $("#send_eth_fiataddress").val();
	if(fiat_address.length == 0){return;}
	fiat_address = fiat_address.substring(2); // Remove leading 0x
	fiat_address = padleftzero(fiat_address,64)

	const transactionParameters = [{
	  to: contractAddress,
	  gasPrice: '0x218711A00',
	  gas: '0x30D40',
	  from: userAddress,
	  value: sendamount_wei.toString(16), // Convert to Hex
	  data: '0x'+contract_openSwap+myTradeID+fiat_address
	}];

	sendETHTransaction(transactionParameters);
}

function tryRefund(){
	// The user has opted to refund from the swap position after waiting too long
	const transactionParameters = [{
	  to: contractAddress,
	  gasPrice: '0x218711A00',
	  gas: '0x30D40',
	  from: userAddress,
	  data: '0x'+contract_refundSwap+myTradeID
	}];

	sendETHTransaction(transactionParameters);
}

function tryAddCollateral(){
	// Fiat trader is adding collateral to the swap position
	var collateral_eth = new BigNumber($("#get_eth_collateral").html());
	var collateral_wei = collateral_eth.multipliedBy("1000000000000000000"); // Get as wei
	if(collateral_wei == 0){return;}

	const transactionParameters = [{
	  to: contractAddress,
	  gasPrice: '0x218711A00',
	  gas: '0x30D40',
	  from: userAddress,
	  value: collateral_wei.toString(16), // Convert to Hex
	  data: '0x'+contract_addFiatTraderCollateral+myTradeID
	}];

	sendETHTransaction(transactionParameters);
}

function tryClose(){
	// The user has marked the trade as closed, finish the transfer
	const transactionParameters = [{
	  to: contractAddress,
	  gasPrice: '0x218711A00',
	  gas: '0x30D40',
	  from: userAddress,
	  data: '0x'+contract_closeSwap+myTradeID
	}];

	sendETHTransaction(transactionParameters);
}

function sendETHTransaction(transactionParameters){
	// This is a generic function to send ETH to the contract
	if (ethereum.networkVersion !== targetNetwork) {
		// Not equal to the mainnet, let user know to switch
		alert('This application requires the main network, please switch it in your MetaMask UI.')
		return;
	}

	ethereum.sendAsync({
	  method: 'eth_sendTransaction',
	  params: transactionParameters,
	  from: userAddress
	}, function (err, result) {
		if(!err){
			if(!result["error"]){
				console.log("Transaction hash: "+result["result"]);
				statusChanged = true; // Force update of status
			}else{
				console.log("RPC error: "+result["error"]);
			}
		}else{
			console.log("An error occurred while pinging blockchain");
		}
	});
}

function setupCORSProxy(){
	// We need a CORS Proxy to allow cross site requests through JQuery ajax
	$.ajaxPrefilter(function(options) {
	    if (options.crossDomain && jQuery.support.cors) {
	        options.url = 'https://cors-anywhere.herokuapp.com/' + options.url;
	    }
	});
}

function showContactInfo(proto_open_order_view){
	var open_order_view = $(proto_open_order_view); // Convert javascript object to jquery object
	var open_order = open_order_view.parent().parent().parent().parent().parent(); // Get the div that contains the entire open order
	open_order.children(".open_order_contact").toggle(); // Now show that div with the contact info
}

function addOpenOrder(order_id,type,price,fiat_symbol,quantity,min_quantity,payment_method,contact_method,contact_address){
	// This will add an order to its respective marketplace
	var order_prefix = "BUY";
	if(type == 1){
		order_prefix = "SELL";
	}
	var add_container = $("#buy_orders_container");
	if(type == 1){
		add_container = $("#sell_orders_container");
	}
	add_container.append(''+
			'<div class="open_order">'+
				'<table>'+
					'<tbody>'+
						'<tr class="open_order_header">'+
							'<td>'+
								''+order_prefix+' Price'+
							'</td>'+
							'<td>'+
								'Quantity'+
							'</td>'+
							'<td>'+
								'Minimum Quantity'+
							'</td>'+
							'<td>'+
								'Payment Method'+
							'</td>'+
							'<td>'+
								'Contact'+
							'</td>'+
						'</tr>'+
						'<tr class="open_order_details">'+
							'<td>'+
								''+price+' '+fiat_symbol.toUpperCase()+''+
							'</td>'+
							'<td>'+
								''+quantity+' ETH'+
							'</td>'+
							'<td>'+
								''+min_quantity+' ETH'+
							'</td>'+
							'<td>'+
								''+payment_method+
							'</td>'+
							'<td>'+
								'<span style="color: rgb(100,100,100); text-decoration: underline; cursor: pointer;" onclick="showContactInfo(this);">View</span>'+
							'</td>'+
						'</tr>'+				
					'</tbody>'+
				'</table>'+
				'<div class="open_order_contact">'+
					'<strong>Contact Method:</strong> '+contact_method+'<br>'+
					'<strong>Contact Address:</strong> '+contact_address+
					'<div style="position: absolute; bottom: 0px; right: 5px;">'+
						'<span style="color: rgb(100,100,100); cursor: pointer; font-size: 12px;" onclick="removeMyOrder(\''+order_id+'\');">Remove Offer</small>'+
					'</div>'+
				'</div>'+
			'</div>'+
		'');
}

function removeMyOrder(order_id){
	// Get the user code to remove the order
	var code = prompt("Enter the Order Secret Code To Remove Order","");
	if(code == null){return;}
	$.post( marketplace_url,
		{ 
			request: "remove_offer",
			id: order_id,
			code: code }  //JSON format
		, function(data){
			if(data){
				if(data == "Success"){
					alert("Removed offer from database successfully!");
				}else{
					alert("Failed to removed offer from database.");
				}
			}
		});
}

function postOffer(){
	// This will take the offer form and send it to marketplace database
	var order_type = $("#order_type").val();
	var fiat_symbol = $("#input_fiat_symbol").val();
	if(fiat_symbol.length > 5){
		alert("Fiat Symbol has too many characters. Please use abbreviation.");
		return;
	}
	var price = $("#input_price").val();
	var quantity = $("#input_quantity").val();
	var min_quantity = $("#input_min_quantity").val();
	var pay_method = $("#input_payment_method").val();
	if(pay_method.length > 20){
		alert("Payment method text too long. Please shorten the text.");
		return;
	}
	var contact_method = $("#input_contact_method").val();
	if(contact_method.length > 20){
		alert("Contact method text too long. Please shorten the text.");
		return;		
	}
	var contact_add = $("#input_contact_add").val();
	if(contact_add.length > 200){
		alert("Contact Address text too long. Please shorten the text.");
		return;		
	}
	var important = $("#important_box").val();

	// Now post the data
	$.post( marketplace_url,
		{ 
			request: "add_offer",
			type: order_type,
			fiat: fiat_symbol,
			price: price,
			quant: quantity,
			min_quant: min_quantity,
			pay_method: pay_method,
			con_method: contact_method,
			honeypot: important,
			con_add: contact_add }  //JSON format
		, function(data){
			if(data){
				// data should return the offer secret code, used to delete the offer earlier than 7 days by the user
				$("#offer_form").hide();				
				reloadMarket(order_type);
				alert("Order posted! This is your Offer Secret Code:\n"+data);
			}else{
				alert("Failed to post offer to database");
			}
		});

}

function reloadMarket(type){
	// This will clear the current list and reload them into view
	if(type == 0){
		$("#buy_orders_container").empty(); //Remove everything
	}else{
		$("#sell_orders_container").empty(); // Remove everything
	}
	// Then load the first page again (most recent orders)
	getOpenOffers(type,0); // Will populate the respective list with open offers
}

function getOpenOffers(order_type, page){
	// This method will try to get open offers from the server and add them to the page
	var market_place = "buy";
	if(order_type == 1){
		market_place = "sell";
	}

	$.get( marketplace_url,
		{ 
			request: "get_offers",
			market: market_place,
			offer_page: page }  // JSON format
		, function(data){
			if(data){
				if(data != "Failed"){
					var offers = $.parseJSON(data);
					if(offers.length == 0){
						if(page == 0){
							if(order_type == 0){
								// There are no offers to show
								$("#buy_orders_view").html("No Offers");
							}else{
								$("#sell_orders_view").html("No Offers");
							}
						}else{
							if(order_type == 0){
								// There are no more offers to show
								$("#buy_orders_view").html("No More Offers");
							}else{
								$("#sell_orders_view").html("No More Offers");
							}							
						}
						return;
					}else if(offers.length < 10){
						if(order_type == 0){
							// There are no more offers to show
							$("#buy_orders_view").html("No More Offers");
						}else{
							$("#sell_orders_view").html("No More Offers");
						}						
					}else if(offers.length >= 10){
						// 10 is max offers per page
						if(order_type == 0){
							// Change the contents of the View More button
							$("#buy_orders_view").html('<span style="text-decoration: underline; cursor: pointer;" onclick="getOpenOffers(0, '+(page+1)+');">View More...</span>');
						}else{
							$("#sell_orders_view").html('<span style="text-decoration: underline; cursor: pointer;" onclick="getOpenOffers(1, '+(page+1)+');">View More...</span>');
						}						
					}
					for(var i = 0; i < offers.length; i++){
						// Go through each offer and add them to the view
						addOpenOrder(offers[i].offer_id,order_type,offers[i].price,offers[i].fiat,offers[i].quant,offers[i].min_quant,offers[i].pay,offers[i].contactm,offers[i].contacta);
					}
				}
			}
		});	
}