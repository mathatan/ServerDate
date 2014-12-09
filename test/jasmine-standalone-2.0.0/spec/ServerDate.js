describe("ServerDate", function () {
	describe("constructor", function () {
		it("returns a string when called without new", function () {
			expect(typeof(ServerDate())).toBe('string');
		});

		it("returns itself when called with new", function () {
		  expect(new ServerDate()).toBe(ServerDate);
		});

		it("parse is the same as Date.parse", function () {
			expect(ServerDate.parse).toBe(Date.parse);
		});

		it("UTC is the same as Date.UTC", function () {
			expect(ServerDate.UTC).toBe(Date.UTC);
		});

		it("now returns a number", function () {
			expect(typeof(ServerDate.now())).toBe('number');
		});
	});

	describe("immutable methods return the same type as their Date counterparts",
	  function () {
	  var
	    date;

	  date = new Date();

    ['toString', 'toDateString', 'toTimeString', 'toLocaleString',
      'toLocaleDateString', 'toLocaleTimeString', 'valueOf', 'getTime',
      'getFullYear', 'getUTCFullYear', 'getMonth', 'getUTCMonth', 'getDate',
      'getUTCDate', 'getDay', 'getUTCDay', 'getHours', 'getUTCHours',
      'getMinutes', 'getUTCMinutes', 'getSeconds', 'getUTCSeconds',
      'getMilliseconds', 'getUTCMilliseconds', 'getTimezoneOffset', 'toUTCString',
      'toISOString', 'toJSON']
      .forEach(function (method) {
        it(method, function () {
          expect(typeof(ServerDate[method]())).toBe(typeof(date[method]()));
        });
      });
  });

  describe("mutable Date methods are undefined", function () {
    ['setDate', 'setFullYear', 'setHours', 'setMilliseconds', 'setMinutes',
      'setMonth', 'setSeconds', 'setTime', 'setUTCDate', 'setUTCFullYear',
      'setUTCHours', 'setUTCMilliseconds', 'setUTCMinutes', 'setUTCMonth',
      'setUTCSeconds', 'setYear']
      .forEach(function (method) {
        it(method, function () {
          expect(ServerDate[method]).toBe(undefined);
        });
      });
  });

  describe("network behaviour", function () {
    it("returns Date.now(), if there is no connection", function() {
      expect(ServerDate.now()).toBe(Date.now());
    });
  });

});
