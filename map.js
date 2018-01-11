function createMem(number, limit, refreshF = null) {
  var mem = Object.create(bucketsProto)
    mem.refreshF = refreshF
    mem.N = number
    mem.max = limit
    mem.clear()
    return mem
}

var bucketsProto = {
    clear: function clear() {
        this.size = 0
        this.buckets=[];
        for (var i = 0; i < this.N; i++) {
            this.spawnBucket()
        }
    },
    spawnBucket: function spawnBucket() {
        this.buckets.unshift(new Map())
    },
    rotateBuckets: function rotateBuckets() {
        var dropped = this.buckets.pop()
        this.spawnBucket()
        this.size = 0
        if(this.rotationHook){
            this.rotationHook(dropped)
        }
    },
    set: function set(key, value) {
        if (!(this.buckets[0].has(key))) {
            this.size++;
            if (this.max && this.size >= Math.ceil(this.max / this.buckets.length)) {
                this.rotateBuckets()
            }
        }
        this.buckets[0].set(key, value)
        return value
    },
    get: function get(key) {
        for (var i = 0; i < this.buckets.length; i++) {
            if (this.buckets[i].has(key)) {
                const value = this.buckets[i].get(key)
                if (i) {
                    //put a reference in the newest bucket
                    this.set(key,value)
                    if (this.refreshF) this.refreshF(key)
                }
                return value
            }
        }
    }
}



module.exports = function(opts) {
    var buckets = ~~(opts.buckets) || 2;
    var mem = createMem(buckets, opts.limit)
    mem.rotationHook = opts.cleanupListener || null

    if (opts.maxTTL) {
        var intervalHandle = setInterval(mem.rotateBuckets.bind(mem), ~~(opts.maxTTL / buckets))
    }

    return {
        set: mem.set.bind(mem),
        get: mem.get.bind(mem),
        clear: mem.clear.bind(mem),
        destroy: function() {
            clearInterval(intervalHandle)
        },
        _get_buckets: function() {
            return mem.buckets
        },
        _rotate_buckets: function() {
            return mem.rotateBuckets()
        }
    }


}
