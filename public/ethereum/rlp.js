
/*
from utils import big_endian_to_int, int_to_big_endian


def __decode(s, pos=0):
    assert pos < len(s), "read beyond end of string in __decode"

    fchar = ord(s[pos])
    if fchar < 128:
        return (s[pos], pos + 1)
    elif fchar < 184:
        b = fchar - 128
        return (s[pos + 1:pos + 1 + b], pos + 1 + b)
    elif fchar < 192:
        b = fchar - 183
        b2 = big_endian_to_int(s[pos + 1:pos + 1 + b])
        return (s[pos + 1 + b:pos + 1 + b + b2], pos + 1 + b + b2)
    elif fchar < 248:
        o = []
        pos += 1
        pos_end = pos + fchar - 192

        while pos < pos_end:
            obj, pos = __decode(s, pos)
            o.append(obj)
        assert pos == pos_end, "read beyond list boundary in __decode"
        return (o, pos)
    else:
        b = fchar - 247
        b2 = big_endian_to_int(s[pos + 1:pos + 1 + b])
        o = []
        pos += 1 + b
        pos_end = pos + b2
        while pos < pos_end:
            obj, pos = __decode(s, pos)
            o.append(obj)
        assert pos == pos_end, "read beyond list boundary in __decode"
        return (o, pos)


def decode(s):
    if s:
        return __decode(s)[0]



def int_to_big_endian(integer):
    '''convert a integer to big endian binary string'''
    # 0 is a special case, treated same as ''
    if integer == 0:
        return ''
    s = '%x' % integer
    if len(s) & 1:
        s = '0' + s
    return s.decode('hex')
    
def encode_length(L, offset):
    if L < 56:
        return chr(L + offset)
    elif L < 256 ** 8:
        BL = int_to_big_endian(L)
        return chr(len(BL) + offset + 55) + BL
    else:
        raise Exception("input too long")


def encode(s):
    if isinstance(s, (str, unicode)):
        s = str(s)
        if len(s) == 1 and ord(s) < 128:
            return s
        else:
            return encode_length(len(s), 128) + s
    elif isinstance(s, list):
        output = ''
        for item in s:
            output += encode(item)
        return encode_length(len(output), 192) + output
    raise TypeError("Encoding of %s not supported" % type(s))

*/

var rlp = (function() {
    var INPUT_LIMIT = Bitcoin.BigInteger.fromBuffer([2])
        .pow(Bitcoin.BigInteger.fromBuffer([8]))
        .pow(Bitcoin.BigInteger.fromBuffer([8]));
    var BI_56 = util.bigInt(56);
    
    function __decode(s, pos) {
        pos = pos || 0;
        //assert pos < len(s), "read beyond end of string in __decode"
        var b, b2, o, obj, pos_end, res;
        var fchar = s[pos].charCodeAt(0);

        if (fchar < 128) {
            return [s[pos], pos + 1];
        }
        else if (fchar < 184) {
            b = fchar - 128;
            return [s.slice(pos + 1,pos + 1 + b), pos + 1 + b];
        }
        else if (fchar < 192) {
            b = fchar - 183;
            b2 = util.bigEndianToInt(s.slice(pos + 1,pos + 1 + b));
            return [s.slice(pos + 1 + b,pos + 1 + b + b2), pos + 1 + b + b2];
        }
        else if (fchar < 248) {
            o = [];
            pos += 1;
            pos_end = pos + fchar - 192;

            while (pos < pos_end) {
                res = __decode(s, pos);
                obj = res[0]; pos = res[1];
                o.push(obj);
            }
            //assert pos == pos_end, "read beyond list boundary in __decode"
            return [o, pos];
        }
        else {
            b = fchar - 247;
            b2 = util.bigEndianToInt(s.slice(pos + 1,pos + 1 + b));
            o = [];
            pos += 1 + b;
            pos_end = pos + b2;
            while (pos < pos_end) {
                res = __decode(s, pos);
                obj = res[0]; pos = res[1];
                o.push(obj);
            }
            //assert pos == pos_end, "read beyond list boundary in __decode"
            return [o, pos];
        }   
    }

    function decode(s) {
        if (s) {
            return __decode(s)[0];
        }
    }

    // L is BigInteger
    function encodeLength(L, offset) {
        if (L.compareTo(BI_56) < 0) {
            return String.fromCharCode(L.intValue() + offset);
        }
        else if (L.compareTo(INPUT_LIMIT) < 0) {
            var BL = util.intToBigEndian(L);
            return String.fromCharCode(BL.length + offset + 55) + BL;
        }
        else {
            throw new Error("input too long");
        }
    }

    function encode(s) {
        if (_.isString(s)) {
            if (s.length === 1 && s.charCodeAt(0) < 128) {
                return s;
            }
            else {
                return encodeLength(util.bigInt(s.length), 128) + s;
            }
        }
        else if (_.isArray(s)) {
            var output = _.reduce(s, function(output, item) {
                return output += encode(item);
            }, '');        
            return encodeLength(util.bigInt(output.length), 192) + output    
        }
        else {
            throw new Error("input must be string or array");
        }
    }
      
    return {
        decode: decode,
        encode: encode
    }
})();
