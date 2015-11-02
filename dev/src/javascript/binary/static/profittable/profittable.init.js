
var ProfitTableWS = (function () {
    var batchSize = 50;
    var chunkSize = batchSize/2;

    var transactionsReceived = 0;
    var transactionsConsumed = 0;
    var noMoreData = false;
    var pending = false;

    var currentBatch = [];

    var tableExist = function(){
        return document.getElementById("profit-table");
    };

    var finishedConsumed = function(){
        return transactionsConsumed === transactionsReceived;
    };

    function initTable(){
        currentBatch = [];
        transactionsConsumed = 0;
        transactionsReceived = 0;
        pending = false;

        $(".error-msg").text("");

        if (tableExist()) {
            ProfitTableUI.cleanTableContent();
        }
    }

    function profitTableHandler(response){

        pending = false;
        var profitTable = response.profit_table;
        currentBatch = profitTable.transactions;
        transactionsReceived += currentBatch.length;

        if (currentBatch.length < batchSize) {
            noMoreData = true;
        }

        if (!tableExist()) {
            ProfitTableUI.createEmptyTable().appendTo("#profit-table-ws-container");
            ProfitTableUI.updateProfitTable(getNextChunk());
            Content.profitTableTranslation();
        }
    }

    function getNextBatchTransactions(){
        ProfitTableData.getProfitTable({offset: transactionsReceived, limit: batchSize});
        pending = true;
    }

    function getNextChunk(){
        var chunk = currentBatch.splice(0, chunkSize);
        transactionsConsumed += chunk.length;
        return chunk;
    }

    function onScrollLoad(){
        $(document).scroll(function(){
            function hidableHeight(percentage){
                var totalHidable = $(document).height() - $(window).height();
                return Math.floor(totalHidable * percentage / 100);
            }

            var pFromTop = $(document).scrollTop();

            if (!tableExist()){
                return;
            }

            if (pFromTop < hidableHeight(70)) {
                return;
            }

            if (finishedConsumed() && !noMoreData && !pending) {
                getNextBatchTransactions();
                return;
            }

            if (!finishedConsumed()) {
                ProfitTableUI.updateProfitTable(getNextChunk());
            }
        });
    }



    function init(){
        getNextBatchTransactions();
        onScrollLoad();
    }

    return {
        profitTableHandler: profitTableHandler,
        init: init,
        clean: initTable
    };
}());
