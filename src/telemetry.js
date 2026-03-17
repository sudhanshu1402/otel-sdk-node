"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTelemetry = exports.sdk = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const exporter_trace_otlp_grpc_1 = require("@opentelemetry/exporter-trace-otlp-grpc");
const exporter_metrics_otlp_grpc_1 = require("@opentelemetry/exporter-metrics-otlp-grpc");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const resources_1 = require("@opentelemetry/resources");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const traceExporter = new exporter_trace_otlp_grpc_1.OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
});
const metricExporter = new exporter_metrics_otlp_grpc_1.OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
});
const metricReader = new sdk_metrics_1.PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10000,
});
exports.sdk = new sdk_node_1.NodeSDK({
    resource: new resources_1.Resource({
        'service.name': process.env.OTEL_SERVICE_NAME || 'orchestration-api',
    }),
    traceExporter,
    metricReader,
    instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()],
});
const initializeTelemetry = () => {
    exports.sdk.start();
    console.log('🚀 OpenTelemetry SDK Initialized');
    // Graceful shutdown
    process.on('SIGTERM', () => {
        exports.sdk.shutdown()
            .then(() => console.log('OpenTelemetry SDK gracefully shut down'))
            .catch((error) => console.log('Error shutting down OpenTelemetry SDK', error))
            .finally(() => process.exit(0));
    });
};
exports.initializeTelemetry = initializeTelemetry;
//# sourceMappingURL=telemetry.js.map