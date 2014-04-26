angular.module('tryethereum', []);

function TryEthereumCtrl($scope,$http) {
    window.wscope = $scope;
    $scope.dequote = function(s) {
        if (s[0] == '"') {
            return s.substring(1,s.length-1)
        }
    }
    $scope.errlogger = function(r) {
        $scope.error = r.data || r;
        $scope.response = ''
        throw r;
    }
    $scope.serpent = function(arg,data) {
        $http.post('/serpent/'+arg,{ data: data })
             .success(function(r) {
		         $scope.response = r.replace(/"/g,'')
                 $scope.error = ''
             })
             .error(function(r) {
		         $scope.error = 'compilation error: '+r
                 $scope.response = ''
             })
    }
    $scope.pyethtool = function(cmd, args) {
        q = ''
        c = 0
        for (var a in args) {
            q += c+'='+a+'&'
        }
        q = q.substring(0,q.length-1)
        $http.get('/pyethtool/'+cmd+'?'+q)
             .success(function(r) {
		         $scope.response = r.replace(/"/g,'')
                 $scope.error = ''
             })
             .error($scope.errlogger)
    }
    $scope.alloc = function(addr, amount) {
        $http.post('/alloc',{ addr: addr, amount: amount })
            .success(function(r) {
                $scope.response = "Allocated "+amount+" to "+addr
                $scope.error = ''
                $scope.fetchdata($scope.address,'account')
                $scope.fetchdata($scope.search_address,'search_account')
            })
            .error($scope.errlogger)
    }
    $scope.applytx = function(tx) {
        $http.post('/applytx',{ data: tx })
            .success(function(r) {
                $scope.response = r.response
                $scope.error = ''
                $scope.fetchdata($scope.address,'account')
                $scope.fetchdata($scope.search_address,'search_account')
            })
            .error($scope.errlogger)
    }
    $scope.sendtx = function(key, nonce, value, to, data) {
        var datahex = {data:''};  // TODO: encodeDatalist(data);
        
        var tx = transaction.mktx(
            util.bigInt(nonce),
            util.bigInt(value), to, datahex.data);       
        //console.log('mktx: ', tx);

        var parsedTx = transaction.parse(util.decodeHex(tx));
        //console.log('parsedTx: ', parsedTx);

        var signedTx = transaction.sign(parsedTx, key);        
        //console.log('signedTx: ', signedTx);

        $http.post('/applytx',{ data: signedTx })
             .then(function(r) {
                $scope.response = r.data.response
                $scope.error = ''
                $scope.fetchdata($scope.address,'account')
                $scope.fetchdata($scope.search_address,'search_account')
             },$scope.errlogger)
    }
    $scope.contract = function(nonce, endowment, code) {
        $http.post('/serpent/compile',{ data: code })
             .then(function(codehex) {
                 return $http.get('/pyethtool/mkcontract?0='+nonce+'&1='+(endowment || 0)+'&2='+codehex.data)
             },$scope.errlogger)
             .then(function(tx) {
                 return $http.get('/pyethtool/sign?0='+tx.data+'&1='+$scope.key)
             },$scope.errlogger)
             .then(function(signedTx) {
                 return $http.post('/applytx',{ data: signedTx.data })
             },$scope.errlogger)
             .then(function(r) {
                console.log(r.data)
                $scope.fetchdata($scope.address,'account')
                $scope.fetchdata($scope.search_address,'search_account')
                $scope.response = "Contract address: "+r.data.response
             },$scope.errlogger)
    }
    $scope.genseed = function() {
        $scope.seed = encodeURIComponent((''+Math.random()).substring(2)+''+new Date().getTime())
    }
    $scope.genkey = function() {
        var hash = util.sha3($scope.seed);
        $scope.key = CryptoJS.enc.Hex.stringify(hash);
        $scope.address = util.privToAddr($scope.key);
    }
    $scope.$watch('seed',$scope.genkey)
    $scope.fetchdata = function(address,dest) {
        $http.get('/account_to_dict?address='+address)
            .success(function(r) {
                $scope[dest] = r
            })
    }
    $scope.$watch('address',function() { $scope.fetchdata($scope.address,'account') })
    $scope.$watch('search_address',function() { $scope.fetchdata($scope.search_address,'search_account') })
}
