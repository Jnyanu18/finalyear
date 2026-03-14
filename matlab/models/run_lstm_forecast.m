function outputPath = run_lstm_forecast(timeseriesPath, modelPath, outputPath)
%RUN_LSTM_FORECAST Predict seven days of vegetation stress using an LSTM model.

arguments
    timeseriesPath (1, :) char
    modelPath (1, :) char
    outputPath (1, :) char = fullfile('matlab', 'runtime', 'forecast_7day.json')
end

if endsWith(lower(timeseriesPath), '.csv')
    data = readtable(timeseriesPath);
elseif endsWith(lower(timeseriesPath), '.mat')
    loaded = load(timeseriesPath);
    data = struct2table(loaded.timeseries);
else
    error('run_lstm_forecast:InvalidInput', 'Supported inputs are CSV or MAT files.');
end

requiredVars = ["NDVI", "NDRE", "SAVI", "soil_moisture", "temperature", "humidity", "leaf_wetness"];
missingVars = requiredVars(~ismember(requiredVars, string(data.Properties.VariableNames)));
if ~isempty(missingVars)
    error('run_lstm_forecast:MissingColumns', 'Missing columns: %s', strjoin(cellstr(missingVars), ', '));
end

modelStruct = load(modelPath);
if ~isfield(modelStruct, 'trainedNet')
    error('run_lstm_forecast:MissingModel', 'The model MAT file must contain trainedNet.');
end

window = data{max(1, height(data) - 29):height(data), cellstr(requiredVars)}';
[windowNorm, stats] = normalize_data(window', "zscore");
windowNorm = windowNorm';
pred = predict(modelStruct.trainedNet, {windowNorm});
pred = pred{1};
if size(pred, 1) < 7
    pred = repmat(pred(end, :), 7, 1);
end
attentionWeights = softmax(mean(abs(windowNorm), 2));
forecast = repmat(struct('date', '', 'ndvi_pred', 0, 'stress_index', 0, 'attention', []), 7, 1);
for i = 1:7
    forecast(i).date = string(datetime('today') + days(i));
    forecast(i).ndvi_pred = pred(min(i, size(pred, 1)), 1) .* stats.std(1) + stats.mean(1);
    forecast(i).stress_index = max(0, 1 - forecast(i).ndvi_pred);
    forecast(i).attention = attentionWeights';
end

fid = fopen(outputPath, 'w');
fprintf(fid, '%s', jsonencode(forecast));
fclose(fid);
end
