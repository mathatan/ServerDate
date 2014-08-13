define(function() {
    return {
        serverDate: {
            // What is the URL that returns us the server time
            url: "http://localhost:8888/api/get_time",
            // How many samples do we try and get until we are satisfied
            syncSamples: 10,
            // After the initial synchronization the two clocks may drift so we
            // automatically synchronize again every synchronizationIntervalDelay.
            synchronizationIntervalDelay: 60 * 60 * 1000,
            // How often to perform amortization, in ms
            amortizationInterval: 500,
            // How many ms per interval to adjust, in ms
            // After a synchronization there may be a significant difference between our
            // clock and the server's clock.  Rather than make the change abruptly, we
            // change our clock by adjusting it once per second by the amortizationRate.
            amortizationAmount: 25,
            // The exception to the above is if the difference between the clock and
            // server's clock is too great (threshold set below, in ms).  If that's the
            // case then we skip amortization and set the clock to match the server's
            // clock immediately.
            amortizationThreshold: 1000
        }
    };
});