function run_pipeline(inputJsonPath)
%RUN_PIPELINE End-to-end AgroSense batch pipeline entrypoint for the Node bridge.

arguments
    inputJsonPath (1, :) char = fullfile('matlab', 'runtime', 'input.json')
end

payload = jsondecode(fileread(inputJsonPath));
workingDir = fullfile('matlab', 'runtime');
if ~isfolder(workingDir)
    mkdir(workingDir);
end

cubePath = ingest_hyperspectral(payload.imagePath, fullfile(workingDir, 'calibrated_cube.mat'));
extract_indices(cubePath, fullfile(workingDir, 'indices'));
segment_zones(fullfile(workingDir, 'indices', 'index_maps.mat'), fullfile(workingDir, 'zones'));
run_cnn_inference(payload.cnnModelPath, cubePath, fullfile(workingDir, 'zones', 'zone_map.mat'), fullfile(workingDir, 'cnn_results.json'));
run_lstm_forecast(payload.timeseriesPath, payload.lstmModelPath, fullfile(workingDir, 'forecast_7day.json'));
run_fusion_risk(payload.featurePath, payload.sensorPath, payload.fusionModelPath, fullfile(workingDir, 'risk_scores.json'));
generate_alerts(workingDir, payload.outputPath);
end
