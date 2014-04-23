var transaction = (function() {
    var encode_int = util.intToBigEndian;
    var decode_int = util.bigEndianToInt;

    function mktx(nonce, value, to, data) {
        var opts = {
            nonce: nonce,
            value: value,
            gasprice: util.bigInt(Math.pow(10, 12)),
            startgas: util.bigInt(10000),
            to: to,
            data: util.decodeHex(data)
        };
               
        return util.encodeHex(
                serialize(
                makeTransaction(opts), false));
    }
    
    function serialize(tx, isSigned) {
        var arr = [encode_int(tx.nonce),
                           encode_int(tx.value),
                           encode_int(tx.gasprice),
                           encode_int(tx.startgas),
                           util.coerce_addr_to_bin(tx.to),
                           tx.data,
                           encode_int(tx.v),
                           encode_int(tx.r),
                           encode_int(tx.s)];
        var forRlp = isSigned ? _.take(arr, 9) : _.take(arr, 6);
        console.log('forRlp: ', forRlp);
        return rlp.encode(forRlp);
    }

    function makeTransaction(opts) {
//        if (_.key(opts).length > 7) {
//            throw new Error('TODO makeTransaction');
//        }
        return {
            nonce: opts.nonce,
            value: opts.value,
            gasprice: opts.gasprice,
            startgas: opts.startgas,
            to: util.coerce_addr_to_bin(opts.to),
            data: opts.data,
            
            v: Bitcoin.BigInteger.ZERO,
            r: Bitcoin.BigInteger.ZERO,
            s: Bitcoin.BigInteger.ZERO,
            sender: 0
        }
    }
    
    function sign(tx, key) {
        return util.encodeHex(serialize(__sign(tx, key), true));
    }
        
    function __sign(tx, key) {
        //console.log('sign rlp encode: ', util.encodeHex(rlp.encode(serialize(tx, false))));
        //window.input = rlp.encode(serialize(tx, false));
        var binaryForCryptoJs = CryptoJS.enc.Latin1.parse(rlp.encode(serialize(tx, false)));
        var wordArray = util.sha3(binaryForCryptoJs);
        var rawhash = Bitcoin.convert.wordArrayToBytes(wordArray);
        //console.log('rawhash hex: ', rawhash.toString(), 'key: ', key);
        //window.rh = rawhash;
        
        // false flag important since key is uncompressed
        var ecKey = Bitcoin.ECKey.fromHex(key, false);
        var sig = ecKey.sign(rawhash);
//        console.log('sig: ', sig);
        
        var parsedSig = Bitcoin.ecdsa.parseSig(sig);
        
        var iVal = my_calcPubkeyRecoveryParam(ecKey,
                        parsedSig.r, parsedSig.s, rawhash);
        console.log('iVal: ', iVal);
              
        tx.v = util.bigInt(27 + iVal);  // i%2 like in main.py ?
        tx.r = parsedSig.r;
        tx.s = parsedSig.s
        tx.sender = util.privToAddr(key);
        console.log('signed tx: ', tx);

        window.tx = tx;

        return tx;
    }
    
    function my_calcPubkeyRecoveryParam(key, r, s, hash) {
        var pubKeyHex = key.pub.toHex();
        
        for (var i=0; i<4; i++) {
            if (Bitcoin.convert.bytesToHex(Bitcoin.ecdsa.recoverPubKey(r, s, hash, i).getEncoded()) === pubKeyHex) {
                return i;
            }
        }
        
        throw new Error("Unable to find valid recovery factor");
    }
        
    function parse(data) {
        if (data.match(/^[0-9a-fA-F]*$/)) {
            data = util.decodeHex(data);
        }
        console.log('tx parse data: ', data);
        var o = rlp.decode(data).concat(['','','']);
        console.log('parse o: ', o);
        window.jj = o;
        console.log('setting TO: ', o[4])
        var opts = {
            nonce: decode_int(o[0]),
            value: decode_int(o[1]),
            gasprice: decode_int(o[2]),
            startgas: decode_int(o[3]),
            to: util.encodeHex(o[4]),
            data: o[5],
            v: decode_int(o[6]),
            r: decode_int(o[7]),
            s: decode_int(o[8])
        };         
       
        var tx = makeTransaction(opts);
        console.log('tx parse return: ', tx);         
        return tx;         
    }   
            
    return {
        mktx: mktx,
        sign: sign,
        parse: parse
    }
})();

/*
def mktx(nonce, value, to, data):
    return transactions.Transaction(int(nonce), int(value), 10 ** 12, 10000, to, data.decode('hex')).serialize(False).encode('hex')

    # nonce,value,gasprice,startgas,to,data
    def __init__(*args):
        self = args[0]
        if len(args) == 2:
            self.parse(args[1])
        else:
            self.nonce = args[1]
            self.value = args[2]
            self.gasprice = args[3]
            self.startgas = args[4]
            self.to = utils.coerce_addr_to_bin(args[5])
            self.data = args[6]
            # includes signature
            if len(args) > 7:
                self.v, self.r, self.s = args[7:10]
                if self.r > 0 and self.s > 0:
                    rawhash = sha3(rlp.encode(self.serialize(False)))
                    pub = encode_pubkey(
                        ecdsa_raw_recover(rawhash, (self.v, self.r, self.s)), 'bin')
                    self.sender = sha3(pub[1:])[-20:].encode('hex')
            # does not include signature
            else:
                self.v, self.r, self.s = 0,0,0
                self.sender = 0

    def serialize(self, signed=True):
        return rlp.encode([encode_int(self.nonce),
                           encode_int(self.value),
                           encode_int(self.gasprice),
                           encode_int(self.startgas),
                           utils.coerce_addr_to_bin(self.to),
                           self.data,
                           encode_int(self.v),
                           encode_int(self.r),
                           encode_int(self.s)][:9 if signed else 6])
                          
*/                           
                           

/*
def sign(txdata, key):
    return transactions.Transaction.parse(txdata.decode('hex')).sign(key).serialize(True).encode('hex')
    
Transaction sign(self, key):
    rawhash = sha3(rlp.encode(self.serialize(False)))
    self.v, self.r, self.s = ecdsa_raw_sign(rawhash, key)
    self.sender = privtoaddr(key)
    return self    
*/
