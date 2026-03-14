function outputPath = generate_alerts(inputFolder, outputPath)
%GENERATE_ALERTS Combine model outputs and rule checks into alert objects.

arguments
    inputFolder (1, :) char
    outputPath (1, :) char = fullfile('matlab', 'runtime', 'alerts.json')
end

forecast = jsondecode(fileread(fullfile(inputFolder, 'forecast_7day.json')));
riskScores = jsondecode(fileread(fullfile(inputFolder, 'risk_scores.json')));
alerts = [];

for i = 1:numel(riskScores)
    score = riskScores(i);
    if score.probability >= 0.8
        alerts = [alerts; buildAlert("critical", "Critical Pest Risk", sprintf('%s risk exceeded 80%% in %s.', score.pest_type, score.zone_id), "SensorFusion", score.probability)]; %#ok<AGROW>
    elseif score.probability >= 0.6
        alerts = [alerts; buildAlert("warning", "Elevated Pest Risk", sprintf('%s risk exceeded 60%% in %s.', score.pest_type, score.zone_id), "SensorFusion", score.probability)]; %#ok<AGROW>
    end
end

if numel(forecast) >= 7 && forecast(7).stress_index - forecast(1).stress_index > 0.08
    alerts = [alerts; buildAlert("warning", "Prolonged Stress Trend", "The LSTM forecast shows sustained stress acceleration.", "LSTM", 0.82)]; %#ok<AGROW>
end

fid = fopen(outputPath, 'w');
fprintf(fid, '%s', jsonencode(alerts));
fclose(fid);
end

function alert = buildAlert(severity, title, description, modelSource, confidence)
alert = struct(...
    'id', char(java.util.UUID.randomUUID), ...
    'fieldId', "field-001", ...
    'zoneId', "field-wide", ...
    'severity', severity, ...
    'type', title, ...
    'title', title, ...
    'description', description, ...
    'recommendation', "Inspect the field and trigger an intervention workflow.", ...
    'modelSource', modelSource, ...
    'confidence', confidence, ...
    'triggeredAt', char(datetime('now', 'Format', 'yyyy-MM-dd''T''HH:mm:ssXXX')), ...
    'acknowledgedAt', []);
end
