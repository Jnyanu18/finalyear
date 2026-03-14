function outputPath = run_fusion_risk(featurePath, sensorPath, modelPath, outputPath)
%RUN_FUSION_RISK Score pest and disease risk using boosted trees and CNN features.

arguments
    featurePath (1, :) char
    sensorPath (1, :) char
    modelPath (1, :) char
    outputPath (1, :) char = fullfile('matlab', 'runtime', 'risk_scores.json')
end

features = load(featurePath);
sensors = load(sensorPath);
modelStruct = load(modelPath);
if ~isfield(modelStruct, 'fusionModel')
    error('run_fusion_risk:MissingModel', 'Fusion model MAT file must contain fusionModel.');
end

zoneIds = string(fieldnames(features.cnnFeatures));
pestTypes = ["Fusarium", "Aphid", "Leaf Rust", "Powdery Mildew", "Late Blight", "Bacterial Spot", "Thrips", "Stem Borer", "Downy Mildew", "Whitefly"];
results = [];
for i = 1:numel(zoneIds)
    zoneFeature = features.cnnFeatures.(zoneIds(i));
    sensorVector = sensors.sensorTable{i, {'leaf_wetness', 'air_temp', 'humidity', 'wind_speed', 'ndvi_delta', 'historical_pest_occurrence'}};
    fusedVector = [zoneFeature(:)' sensorVector{:}];
    probabilities = predict(modelStruct.fusionModel, fusedVector);
    if size(probabilities, 2) == 1
        probabilities = repmat(probabilities, 1, numel(pestTypes)) ./ numel(pestTypes);
    end
    for pestIndex = 1:numel(pestTypes)
        entry.zone_id = zoneIds(i);
        entry.pest_type = pestTypes(pestIndex);
        entry.probability = probabilities(min(end, pestIndex));
        results = [results; entry]; %#ok<AGROW>
    end
end

fid = fopen(outputPath, 'w');
fprintf(fid, '%s', jsonencode(results));
fclose(fid);
end
