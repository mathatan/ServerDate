/*

 COPYRIGHT

 Copyright 2012 David Braun

 This file is part of ServerDate.

 ServerDate is free software: you can redistribute it and/or modify
 it under the terms of the GNU Lesser General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 ServerDate is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Lesser General Public License for more details.

 You should have received a copy of the GNU Lesser General Public License
 along with ServerDate.  If not, see <http://www.gnu.org/licenses/>.

*/

/*
 * Changes done by Janne Enberg aka Lietu:
 *
 * - AMD loader format (RequireJS)
 * - Separated configuration values to a separate file
 * - Delayed synchronization to server, doesn't require server to render templates
 * - Simple example HTML page see synchronization effect, updated examples a bit
 */

define(['config'], function (config) {
    'use strict';

    var
        precision,
        offset,
        target = null,
        synchronizing = false;

    /**
     * Tag logged messages for better readability.
     */
    function log() {
        var args = Array.prototype.slice.apply(arguments);
        args.unshift('[ServerDate]');

        if (typeof console !== 'undefined' && console.log) {
            console.log.apply(console, args);
        }
    }

    /**
     * We need to work with precision as well as offset values, so bundle them together conveniently.
     * @param value
     * @param precision
     * @constructor
     */
    function Offset(value, precision) {
        this.value = value;
        this.precision = precision;
    }

    Offset.prototype.valueOf = function () {
        return this.value;
    };

    Offset.prototype.toString = function () {
        // The '±' character doesn't look right in Firefox's console for some
        // reason.
        return this.value + (typeof this.precision != "undefined"
            ? " +/- " + this.precision
            : "") + " ms";
    };


    // Everything is in the global function ServerDate.  Unlike Date, there is no
    // need for a constructor because there aren't instances.

    // Emulate Date's methods.
    function ServerDate() {
        // See http://stackoverflow.com/a/18543216/1330099.
        return this
            ? ServerDate
            : ServerDate.toString();
    }

    ServerDate.parse = Date.parse;
    ServerDate.UTC = Date.UTC;

    /**
     * Get current server time to the best of our knowledge
     * @returns {Number}
     */
    ServerDate.now = function () {
        return Math.round(Date.now() + offset);
    };

    /**
     * Get the current offset and precision information
     * @returns {Offset}
     */
    ServerDate.getOffset = function () {
        return new Offset(offset, precision);
    };

    // Populate ServerDate with the methods of Date's instances that don't change
    // state.

    ["toString", "toDateString", "toTimeString", "toLocaleString",
        "toLocaleDateString", "toLocaleTimeString", "valueOf", "getTime",
        "getFullYear", "getUTCFullYear", "getMonth", "getUTCMonth", "getDate",
        "getUTCDate", "getDay", "getUTCDay", "getHours", "getUTCHours",
        "getMinutes", "getUTCMinutes", "getSeconds", "getUTCSeconds",
        "getMilliseconds", "getUTCMilliseconds", "getTimezoneOffset", "toUTCString",
        "toISOString", "toJSON"]
        .forEach(function (method) {
            ServerDate[method] = function () {
                return new Date(ServerDate.now())[method]();
            };
        });

    /**
     * Because of network delays we can't be 100% sure of the server's time.  We do
     * know the precision in milliseconds and make it available here.
     * @returns {Number}
     */
    ServerDate.getPrecision = function () // ms
    {
        if (typeof target.precision != "undefined") {
            // Take into account the amortization.
            return target.precision + Math.abs(target - offset);
        }
    };

    /**
     * Set a new amortization target
     * @param newTarget The offset we'll get to over time after amortization
     */
    ServerDate._setTarget = function (newTarget) {
        var message = "Set target to " + String(newTarget),
            delta;

        if (target) {
            message += " (" + (newTarget.valueOf() > target.valueOf() ? "+" : "-") + " "
                + Math.abs(newTarget.valueOf() - target.valueOf()) + " ms)";
        }

        target = newTarget;
        log(message + ".");
    };

    /**
     * Synchronize the ServerDate object with the server's clock.
     * @param {Function} callback Optional callback that will be run after synchronization
     */
    ServerDate.synchronize = function (callback) {
        callback = callback || function () {
        };

        var iteration = 1,
            requestTime, responseTime,
            best;

        /**
         * Request a time sample from the server.
         */
        var requestSample = function () {
            var request = new XMLHttpRequest();

            // Ask the server for its opinion of the current time (milliseconds).
            request.open("GET", config.serverDate.url);

            // In case of long requests
            request.timeout = 20 * 1000;

            // At the earliest possible moment of the response, record the time at
            // which we received it.
            request.onreadystatechange = function () {
                // If we got the headers and everything's OK
                if ((this.readyState == this.HEADERS_RECEIVED)
                    && (this.status == 200))
                    responseTime = Date.now();
            };

            // Process the server's response.
            request.onload = function () {
                // If OK
                if (this.status == 200) {
                    try {
                        // Process the server's version of Date.now().
                        processSample(JSON.parse(this.response));
                    }
                    catch (exception) {
                        log("Unable to read the server's response.");
                    }
                    callback()
                } else {
                    onNetworkError();
                }
            };

            var events = ['ontimeout', 'onerror'];

            for (var i = 0; i < events.length; i++) {
                var e = events[i];
                request[e] = onNetworkError;
            }

            // Remember the time at which we sent the request to the server.
            requestTime = Date.now();

            // Send the request.
            request.send();

        };

        var onNetworkError = function() {
            log('Network error');
            setTimeout(function() {
                log('Trying to get a new sample');
                processSample(null);
            }, 1000);

        };

        /**
         * Process the time sample received from the server.
         * @param {String} serverNow
         */
        var processSample = function (serverNow) {
            var precision = (responseTime - requestTime) / 2;

            if(serverNow) {
                var sample = new Offset(serverNow + precision - responseTime,
                    precision);

                log("sample: " + iteration + ", offset: " + String(sample));

                // Remember the best sample so far.
                if ((iteration == 1) || (precision <= best.precision)) {
                    best = sample;
                }

                offset = best;
            } else {
                log("sample: " + iteration + " failed");
            }

            // Take 10 samples so we get a good chance of at least one sample with
            // low latency.
            if (iteration < config.serverDate.syncSamples) {
                iteration++;
                requestSample();
            } else {
                // If all attempts to get samples failed, apply 0 as offset
                if(!best) {
                    best = new Offset(0, 0);
                }

                // Set the offset target to the best sample collected.
                ServerDate._setTarget(best);

                synchronizing = false;
            }
        };

        if (!synchronizing) {
            log('Connecting to ', config.serverDate.url);
            synchronizing = true;

            // Set a timer to stop synchronizing just in case there's a problem.
            setTimeout(function () {
                    synchronizing = false;
                }, 15 * 1000
            );

            // Request the first sample.
            requestSample();
        }
    };


    ServerDate.setDefault = function () {
        log('Set defaults');
        offset = new Offset(0, 0);
        ServerDate._setTarget(offset);
    };

    ServerDate.setDefault();

    ServerDate.synchronize(function () {
        // Amortization process.  Every second, adjust the offset toward the target by
        // a small amount.
        setInterval(function () {
            if (target === null) {
                return;
            }

            // Don't let me the delta be greater than the amortizationRate in either
            // direction.
            var delta = Math.max(-config.serverDate.amortizationAmount,
                Math.min(config.serverDate.amortizationAmount, target - offset));

            offset += delta;

            if (delta !== 0) {
                log("Offset adjusted by " + delta + " ms to " + offset + " ms (target: "
                + target.value + " ms).");
            }
        }, config.serverDate.amortizationInterval);
    });

    // Synchronize whenever the page is shown again after losing focus.
    window.addEventListener('pageshow', function() {
        ServerDate.synchronize();
    });

    return ServerDate;
});