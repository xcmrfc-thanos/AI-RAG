import React, { memo } from 'react';
import { Select } from 'antd';
import type { VariableOption } from './workflow-editor-operations';

interface VariablePickerProps {
  options: VariableOption[];
  onPick: (value: string) => void;
}

const VariablePicker: React.FC<VariablePickerProps> = ({ options, onPick }) => (
  <Select
    size="small"
    value={undefined}
    style={{ width: '100%' }}
    placeholder="＋ 插入上游变量"
    options={options.map((item) => ({
      value: item.value,
      label: item.label,
      title: item.description,
    }))}
    onChange={onPick}
    notFoundContent="暂无可引用的上游输出"
  />
);

export default memo(VariablePicker);
