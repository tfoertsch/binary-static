/*
 * Price object handles all the functions we need to display prices
 *
 * We create Price proposal that we need to send to server to get price,
 * longcode and all other information that we need to get the price for
 * current contract
 *
 *
 * Usage:
 *
 * `socket.send(Price.createProposal())` to send price proposal to sever
 * `Price.display()` to display the price details returned from server
 */
var Price = (function () {
    'use strict';

    var typeDisplayIdMapping = {},
        bufferedIds = {},
        bufferRequests = {},
        form_id = 0;

    var createProposal = function (typeOfContract) {
        var proposal = {proposal: 1}, underlying = document.getElementById('underlying'),
            submarket = document.getElementById('submarket'),
            contractType = typeOfContract,
            amountType = document.getElementById('amount_type'),
            currency = document.getElementById('currency'),
            payout = document.getElementById('amount'),
            startTime = document.getElementById('date_start'),
            expiryType = document.getElementById('expiry_type'),
            duration = document.getElementById('duration_amount'),
            durationUnit = document.getElementById('duration_units'),
            endDate = document.getElementById('expiry_date'),
            endTime = document.getElementById('expiry_time'),
            barrier = document.getElementById('barrier'),
            highBarrier = document.getElementById('barrier_high'),
            lowBarrier = document.getElementById('barrier_low'),
            prediction = document.getElementById('prediction'),
            amountPerPoint = document.getElementById('amount_per_point'),
            stopType = document.querySelector('input[name="stop_type"]:checked'),
            stopLoss = document.getElementById('stop_loss'),
            stopProfit = document.getElementById('stop_profit');

        if (payout && isVisible(payout) && payout.value) {
            proposal['amount'] = parseFloat(payout.value);
        }

        if (amountType && isVisible(amountType) && amountType.value) {
            proposal['basis'] = amountType.value;
        }

        if (contractType) {
            proposal['contract_type'] = typeOfContract;
        }

        if (currency && currency.value) {
            proposal['currency'] = currency.value;
        }

        if (underlying && underlying.value) {
            proposal['symbol'] = underlying.value;
        }

        if (startTime && isVisible(startTime) && startTime.value !== 'now') {
            proposal['date_start'] = startTime.value;
        }

        if (expiryType && isVisible(expiryType) && expiryType.value === 'duration') {
            proposal['duration'] = parseInt(duration.value);
            proposal['duration_unit'] = durationUnit.value;
        } else if (expiryType && isVisible(expiryType) && expiryType.value === 'endtime') {
            var endDate2 = endDate.value;
            var endTime2 = Durations.getTime();
            if(!endTime2){
                var trading_times = Durations.trading_times();
                if(trading_times.hasOwnProperty(endDate2))
                endTime2 = trading_times[endDate2][underlying.value];
            }
            proposal['date_expiry'] = moment.utc(endDate2 + " " + endTime2).unix();
        }

        if (barrier && isVisible(barrier) && barrier.value) {
            proposal['barrier'] = barrier.value;
        }

        if (highBarrier && isVisible(highBarrier) && highBarrier.value) {
            proposal['barrier'] = highBarrier.value;
        }

        if (lowBarrier && isVisible(lowBarrier) && lowBarrier.value) {
            proposal['barrier2'] = lowBarrier.value;
        }

        if(prediction && isVisible(prediction)){
            proposal['barrier'] = parseInt(prediction.value);
        }

        if (amountPerPoint && isVisible(amountPerPoint)) {
            proposal['amount_per_point'] = parseFloat(amountPerPoint.value);
        }

        if (stopType && isVisible(stopType)) {
            proposal['stop_type'] = stopType.value;
        }

        if (stopLoss && isVisible(stopLoss)) {
            proposal['stop_loss'] = parseFloat(stopLoss.value);
        }

        if (stopProfit && isVisible(stopProfit)) {
            proposal['stop_profit'] = parseFloat(stopProfit.value);
        }

        if (contractType) {
            proposal['contract_type'] = typeOfContract;
        }

        proposal['passthrough'] = {form_id:form_id};

        return proposal;
    };

    var display = function (details, contractType) {
        var proposal = details['proposal'];
        var params = details['echo_req'],
            id = proposal['id'],
            type = params['contract_type'] || typeDisplayIdMapping[id],
            is_spread = proposal['spread'] ? true : false;

        if (params && Object.getOwnPropertyNames(params).length > 0) {
            typeDisplayIdMapping[id] = type;

            if (!bufferedIds.hasOwnProperty(id)) {
                bufferedIds[id] = moment().utc().unix();
            }

            if (!bufferRequests.hasOwnProperty(id)) {
                bufferRequests[id] = params;
            }
        }

        var position = contractTypeDisplayMapping(type);
        var container = document.getElementById('price_container_'+position);
        var box = document.getElementById('price_container_' + position);

        var h4 = container.getElementsByClassName('contract_heading')[0],
            amount = container.getElementsByClassName('contract_amount')[0],
            purchase = container.getElementsByClassName('purchase_button')[0],
            description = container.getElementsByClassName('contract_description')[0],
            comment = container.getElementsByClassName('price_comment')[0],
            error = container.getElementsByClassName('contract_error')[0],
            currency = document.getElementById('currency');

        var display = type ? (contractType ? contractType[type] : '') : '';
        if (display) {
            h4.setAttribute('class', 'contract_heading ' + display.toLowerCase().replace(/ /g, '_'));
            if (is_spread) {
                if (position === "top") {
                    h4.textContent = Content.localize().textSpreadTypeLong;
                } else {
                    h4.textContent = Content.localize().textSpreadTypeShort;
                }
            } else {
                h4.textContent = display;
            }
        }

        if (proposal['ask_price']) {
            if (is_spread) {
                amount.textContent = proposal['ask_price'];
            } else {
                amount.textContent = currency.value + ' ' + proposal['ask_price'];
            }
        }

        if (proposal['longcode']) {
            proposal['longcode'] = proposal['longcode'].replace(/[\d\,]+\.\d\d/,function(x){return '<b>'+x+'</b>';});
            description.innerHTML = proposal['longcode'];
        }

        if (document.getElementById('websocket_form')) {

            if (!document.getElementById('websocket_form').checkValidity()) {
                if (box) {
                    box.style.display = 'none';
                }
                processForgetPriceIds();
            }

            else if (document.getElementById('websocket_form').checkValidity()) {
                if (box) {
                    box.style.display = 'block';
                }
            }
        }

        if (details['error']){
            purchase.hide();
            comment.hide();
            error.show();
            error.textContent = details['error'].message;
        }
        else{
            purchase.show();
            comment.show();
            error.hide();
            if (is_spread) {
                displayCommentSpreads(comment, currency.value, proposal['spread']);
            } else {
                displayCommentPrice(comment, currency.value, proposal['ask_price'], proposal['payout']);
            }
            var oldprice = purchase.getAttribute('data-ask-price');
            if (oldprice) {
                displayPriceMovement(amount, oldprice, proposal['ask_price']);
            }
            purchase.setAttribute('data-purchase-id', id);
            purchase.setAttribute('data-ask-price', proposal['ask_price']);
            purchase.setAttribute('data-symbol', id);
            for(var key in bufferRequests[id]){
                if(key && key !== 'proposal'){
                    purchase.setAttribute('data-'+key, bufferRequests[id][key]);
                }
            }
        }
    };

    var clearMapping = function () {
        typeDisplayIdMapping = {};
    };

    var clearBuffer = function () {
        bufferedIds = {};
        form_id = 0;
    };

    return {
        proposal: createProposal,
        display: display,
        clearMapping: clearMapping,
        idDisplayMapping: function () { return typeDisplayIdMapping; },
        bufferedIds: function () { return bufferedIds; },
        bufferRequests: function () { return bufferRequests; },
        getFormId: function(){ return form_id; },
        incrFormId: function(){ form_id++; },
        clearBufferIds: clearBuffer
    };

})();
