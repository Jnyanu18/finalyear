function [normalizedData, stats] = normalize_data(data, method)
%NORMALIZE_DATA Normalize numeric arrays or tables for AgroSense models.
%   [normalizedData, stats] = normalize_data(data, method)
%   method: "zscore" (default) or "minmax"

arguments
    data
    method (1,1) string = "zscore"
end

if istable(data)
    values = table2array(data);
elseif isnumeric(data)
    values = data;
else
    error('normalize_data:InvalidInput', 'Input must be numeric or a table.');
end

if isempty(values) || ~isnumeric(values)
    error('normalize_data:InvalidInput', 'Input must contain numeric values.');
end

stats = struct();
switch lower(method)
    case "zscore"
        stats.mean = mean(values, 1, 'omitnan');
        stats.std = std(values, 0, 1, 'omitnan');
        stats.std(stats.std == 0) = 1;
        normalizedValues = (values - stats.mean) ./ stats.std;
    case "minmax"
        stats.min = min(values, [], 1, 'omitnan');
        stats.max = max(values, [], 1, 'omitnan');
        span = stats.max - stats.min;
        span(span == 0) = 1;
        normalizedValues = (values - stats.min) ./ span;
    otherwise
        error('normalize_data:InvalidMethod', 'Unsupported normalization method: %s', method);
end

if istable(data)
    normalizedData = array2table(normalizedValues, 'VariableNames', data.Properties.VariableNames);
else
    normalizedData = normalizedValues;
end
end
