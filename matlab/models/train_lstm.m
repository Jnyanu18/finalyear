function trainedNet = train_lstm(trainingTablePath, outputPath)
%TRAIN_LSTM Train a stacked LSTM model for temporal stress prediction.

arguments
    trainingTablePath (1, :) char
    outputPath (1, :) char = fullfile('matlab', 'runtime', 'lstm_model.mat')
end

if endsWith(lower(trainingTablePath), '.csv')
    data = readtable(trainingTablePath);
else
    loaded = load(trainingTablePath);
    data = loaded.trainingTable;
end

predictors = data{:, 1:end-1};
targets = data{:, end};
[predictorsNorm, ~] = normalize_data(predictors, "zscore");
sequences = num2cell(predictorsNorm', 1);
responses = num2cell(targets', 1);

layers = [
    sequenceInputLayer(size(predictorsNorm, 2), 'Name', 'input')
    lstmLayer(128, 'OutputMode', 'sequence', 'Name', 'lstm_1')
    dropoutLayer(0.2, 'Name', 'drop_1')
    lstmLayer(128, 'OutputMode', 'sequence', 'Name', 'lstm_2')
    dropoutLayer(0.2, 'Name', 'drop_2')
    lstmLayer(128, 'OutputMode', 'last', 'Name', 'lstm_3')
    fullyConnectedLayer(64, 'Name', 'fc_1')
    reluLayer('Name', 'relu_1')
    fullyConnectedLayer(7, 'Name', 'forecast_head')
    regressionLayer('Name', 'output')
];

options = trainingOptions('adam', ...
    'InitialLearnRate', 5e-4, ...
    'LearnRateSchedule', 'piecewise', ...
    'LearnRateDropPeriod', 5, ...
    'LearnRateDropFactor', 0.4, ...
    'MaxEpochs', 25, ...
    'MiniBatchSize', 32, ...
    'Shuffle', 'every-epoch', ...
    'ValidationPatience', 5, ...
    'Verbose', false, ...
    'Plots', 'none');

trainedNet = trainNetwork(sequences, responses, layers, options);
save(outputPath, 'trainedNet');
end
