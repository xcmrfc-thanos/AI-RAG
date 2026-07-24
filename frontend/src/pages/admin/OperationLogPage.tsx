/**
 * 管理后台页面：OperationLogPage。
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Modal,
  Tag,
  Row,
  Col,
  Statistic,
  Tooltip,
  Progress,
  Radio,
  Typography,
} from 'antd';
import { App } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { foundationService } from '@/services';
import type { OperationLog, LogStatistics } from '@/services/foundation.service';
import dayjs from 'dayjs';
import { LazyECharts } from '@/components/common/LazyECharts';
import { useComplianceConfirm } from '@/hooks';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text } = Typography;

const MODULE_OPTIONS = [
  { value: 'DOCUMENT', label: '文档管理' },
  { value: '文档导出', label: '文档导出' },
  { value: 'USER', label: '用户管理' },
  { value: 'AUTH', label: '认证授权' },
  { value: 'AI', label: 'AI服务' },
  { value: 'SYSTEM', label: '系统配置' },
  { value: 'FILE', label: '文件管理' },
  { value: 'SEARCH', label: '搜索服务' },
  { value: 'GRAPH', label: '知识图谱' },
];

const OPERATION_TYPES = [
  { value: 'CREATE', label: '新增' },
  { value: 'UPDATE', label: '更新' },
  { value: 'DELETE', label: '删除' },
  { value: 'QUERY', label: '查询' },
  { value: 'LOGIN', label: '登录' },
  { value: 'LOGOUT', label: '登出' },
  { value: 'EXPORT', label: '导出' },
  { value: 'IMPORT', label: '导入' },
];

export const OperationLogPage: React.FC = () => {
  const { message } = App.useApp();
  const { runWithConfirm } = useComplianceConfirm();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [statistics, setStatistics] = useState<LogStatistics | null>(null);
  const [selectedLog, setSelectedLog] = useState<OperationLog | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isStatisticsModalVisible, setIsStatisticsModalVisible] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');

  // 筛选条件
  const [filters, setFilters] = useState({
    module: undefined as string | undefined,
    operationType: undefined as string | undefined,
    username: '',
    startTime: undefined as dayjs.Dayjs | undefined,
    endTime: undefined as dayjs.Dayjs | undefined,
  });

  // 分页
  const [pagination, setPagination] = useState({
    current: 1,
    size: 10,
    total: 0,
  });

  useEffect(() => {
    fetchLogs();
    fetchStatistics();
    // 日志请求由分页标量驱动，加载器身份不作为刷新信号。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.size]);

  /**
   * fetchLogs。
   */
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await foundationService.log.list({
        current: pagination.current,
        size: pagination.size,
        module: filters.module,
        operationType: filters.operationType,
        username: filters.username || undefined,
        startTime: filters.startTime?.format('YYYY-MM-DD HH:mm:ss'),
        endTime: filters.endTime?.format('YYYY-MM-DD HH:mm:ss'),
      });

      setLogs(response.list);
      setPagination((prev) => ({
        ...prev,
        total: response.total,
      }));
    } catch (error) {
      message.error('获取日志列表失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * fetchStatistics。
   */
  const fetchStatistics = async () => {
    try {
      const stats = await foundationService.log.statistics({
        startTime: filters.startTime?.format('YYYY-MM-DD HH:mm:ss'),
        endTime: filters.endTime?.format('YYYY-MM-DD HH:mm:ss'),
      });
      setStatistics(stats);
    } catch (error) {
      message.error('获取统计数据失败');
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchLogs();
    fetchStatistics();
  };

  const handleReset = () => {
    setFilters({
      module: undefined,
      operationType: undefined,
      username: '',
      startTime: undefined,
      endTime: undefined,
    });
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  /**
   * handleViewDetail。
   */
  const handleViewDetail = (log: OperationLog) => {
    setSelectedLog(log);
    setIsDetailModalVisible(true);
  };

  /**
   * 按筛选条件批量删除日志；尊重合规「删除二次确认」开关。
   */
  const handleBatchDelete = async () => {
    /**
     * 执行按日期清理操作日志。
     */
    const doDelete = async () => {
      try {
        const beforeDate = filters.endTime?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD');
        await foundationService.log.deleteBeforeDate(beforeDate);
        message.success('删除成功');
        fetchLogs();
        fetchStatistics();
      } catch {
        message.error('删除失败');
      }
    };

    await runWithConfirm('confirmSensitiveDelete', {
      title: '确认删除',
      content: '确定要删除当前筛选条件下的所有日志吗？此操作不可恢复。',
      okText: '确定',
      okButtonProps: { danger: true },
      action: doDelete,
    });
  };

  const getModuleInfo = (module: string) => {
    return MODULE_OPTIONS.find((m) => m.value === module) || {
      label: module,
      color: 'default',
    };
  };

  const getOperationTypeInfo = (type: string) => {
    return OPERATION_TYPES.find((t) => t.value === type) || {
      label: type,
      color: 'default',
    };
  };

  const columns: ColumnsType<OperationLog> = [
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (module) => {
        const info = getModuleInfo(module);
        return <Tag color="blue">{info.label}</Tag>;
      },
      filters: MODULE_OPTIONS.map((m) => ({ text: m.label, value: m.value })),
    },
    {
      title: '操作类型',
      dataIndex: 'operationType',
      key: 'operationType',
      width: 100,
      render: (type) => {
        const info = getOperationTypeInfo(type);
        return <Tag>{info.label}</Tag>;
      },
    },
    {
      title: '操作描述',
      dataIndex: 'operationDesc',
      key: 'operationDesc',
      width: 200,
      ellipsis: true,
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '请求方法',
      dataIndex: 'requestMethod',
      key: 'requestMethod',
      width: 100,
      render: (method) => {
        const colorMap: Record<string, string> = {
          GET: 'green',
          POST: 'blue',
          PUT: 'orange',
          DELETE: 'red',
        };
        return <Tag color={colorMap[method] || 'default'}>{method}</Tag>;
      },
    },
    {
      title: '请求URL',
      dataIndex: 'requestUrl',
      key: 'requestUrl',
      width: 250,
      ellipsis: true,
      render: (url) => (
        <Tooltip title={url}>
          <span style={{ fontSize: 12 }}>{url}</span>
        </Tooltip>
      ),
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: (ip, record) => (
        <div>
          <div>{ip}</div>
          {record.location && (
            <div style={{ fontSize: 12, color: '#999' }}>{record.location}</div>
          )}
        </div>
      ),
    },
    {
      title: '执行时长',
      dataIndex: 'executeTime',
      key: 'executeTime',
      width: 100,
      render: (time) => (
        <span style={{ color: time > 3000 ? '#ff4d4f' : time > 1000 ? '#faad14' : '#52c41a' }}>
          {time}ms
        </span>
      ),
      sorter: (a, b) => (a.executeTime || 0) - (b.executeTime || 0),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) =>
        status === 1 ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            成功
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            失败
          </Tag>
        ),
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  // 图表配置
  const getChartOption = () => {
    if (!statistics) return {};

    const isPie = chartType === 'pie';

    if (isPie) {
      return {
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)',
        },
        legend: {
          orient: 'vertical',
          left: 'left',
        },
        series: [
          {
            name: '操作类型',
            type: 'pie',
            radius: '50%',
            data: Object.entries(statistics.operationTypeStats || {}).map(
              ([name, value]) => ({ name, value })
            ),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      };
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: chartType === 'line' ? 'cross' : 'shadow',
        },
      },
      xAxis: {
        type: 'category',
        data: Object.keys(statistics.operationTypeStats || {}),
        axisLabel: {
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: '操作次数',
          type: chartType,
          data: Object.values(statistics.operationTypeStats || {}),
          smooth: chartType === 'line',
          itemStyle: {
            color: '#1890ff',
          },
        },
      ],
    };
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>操作日志</span>
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总日志数"
                value={statistics?.totalLogs || 0}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="成功日志"
                value={statistics?.successLogs || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="失败日志"
                value={statistics?.failedLogs || 0}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="成功率"
                value={
                  statistics?.totalLogs
                    ? ((statistics.successLogs / statistics.totalLogs) * 100).toFixed(2)
                    : '0.00'
                }
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{
                  color:
                    statistics && statistics.successLogs / statistics.totalLogs > 0.95
                      ? '#52c41a'
                      : '#faad14',
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* 筛选条件 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Input
                placeholder="搜索用户名"
                allowClear
                value={filters.username}
                onChange={(e) => setFilters({ ...filters, username: e.target.value })}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Select
                placeholder="选择模块"
                allowClear
                style={{ width: '100%' }}
                value={filters.module}
                onChange={(value) => setFilters({ ...filters, module: value })}
              >
                {MODULE_OPTIONS.map((module) => (
                  <Option key={module.value} value={module.value}>
                    {module.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Select
                placeholder="选择操作类型"
                allowClear
                style={{ width: '100%' }}
                value={filters.operationType}
                onChange={(value) => setFilters({ ...filters, operationType: value })}
              >
                {OPERATION_TYPES.map((type) => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <RangePicker
                style={{ width: '100%' }}
                showTime
                value={[filters.startTime || null, filters.endTime || null]}
                onChange={(dates) =>
                  setFilters({
                    ...filters,
                    startTime: dates?.[0] || undefined,
                    endTime: dates?.[1] || undefined,
                  })
                }
              />
            </Col>
            <Col xs={24} sm={24} lg={24}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  搜索
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
                <Button
                  icon={<BarChartOutlined />}
                  onClick={() => setIsStatisticsModalVisible(true)}
                >
                  查看统计
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
                  批量删除
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 日志表格 */}
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1600 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.size,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, size) =>
              setPagination((prev) => ({ ...prev, current: page, size })),
          }}
        />
      </Card>

      {/* 日志详情弹窗 */}
      <Modal
        title="日志详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedLog && (
          <Card size="small">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <TextWithLabel label="模块" value={getModuleInfo(selectedLog.module).label} />
                  <TextWithLabel label="操作类型" value={getOperationTypeInfo(selectedLog.operationType).label} />
                  <TextWithLabel label="操作描述" value={selectedLog.operationDesc} />
                  <TextWithLabel label="用户" value={selectedLog.username} />
                </Space>
              </Col>
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <TextWithLabel label="请求方法" value={selectedLog.requestMethod} />
                  <TextWithLabel label="IP地址" value={selectedLog.ipAddress} />
                  {selectedLog.location && (
                    <TextWithLabel label="位置" value={selectedLog.location} />
                  )}
                  <TextWithLabel
                    label="执行时长"
                    value={`${selectedLog.executeTime}ms`}
                    valueStyle={{
                      color:
                        selectedLog.executeTime && selectedLog.executeTime > 3000
                          ? '#ff4d4f'
                          : selectedLog.executeTime && selectedLog.executeTime > 1000
                          ? '#faad14'
                          : '#52c41a',
                    }}
                  />
                  <TextWithLabel
                    label="状态"
                    value={selectedLog.status === 1 ? '成功' : '失败'}
                    valueStyle={{ color: selectedLog.status === 1 ? '#52c41a' : '#ff4d4f' }}
                  />
                </Space>
              </Col>
              <Col span={24}>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">请求URL:</Text>
                </div>
                <div>
                  <Text code style={{ wordBreak: 'break-all' }}>
                    {selectedLog.requestUrl}
                  </Text>
                </div>
              </Col>
              {selectedLog.requestParams && (
                <Col span={24}>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">请求参数:</Text>
                  </div>
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: 12,
                      borderRadius: 4,
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    {selectedLog.requestParams}
                  </pre>
                </Col>
              )}
              {selectedLog.responseResult && (
                <Col span={24}>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">响应结果:</Text>
                  </div>
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: 12,
                      borderRadius: 4,
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    {selectedLog.responseResult}
                  </pre>
                </Col>
              )}
              {selectedLog.errorMsg && (
                <Col span={24}>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">错误信息:</Text>
                  </div>
                  <div style={{ color: '#ff4d4f', whiteSpace: 'pre-wrap' }}>
                    {selectedLog.errorMsg}
                  </div>
                </Col>
              )}
              {selectedLog.userAgent && (
                <Col span={24}>
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">User Agent:</Text>
                  </div>
                  <div style={{ fontSize: 12, color: '#999', wordBreak: 'break-all' }}>
                    {selectedLog.userAgent}
                  </div>
                </Col>
              )}
              <Col span={24}>
                <TextWithLabel
                  label="操作时间"
                  value={dayjs(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                />
              </Col>
            </Row>
          </Card>
        )}
      </Modal>

      {/* 统计图表弹窗 */}
      <Modal
        title="日志统计"
        open={isStatisticsModalVisible}
        onCancel={() => setIsStatisticsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsStatisticsModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={900}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card size="small" title="操作类型分布">
            <Radio.Group
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              style={{ marginBottom: 16 }}
            >
              <Radio.Button value="bar">柱状图</Radio.Button>
              <Radio.Button value="line">折线图</Radio.Button>
              <Radio.Button value="pie">饼图</Radio.Button>
            </Radio.Group>
            <LazyECharts
              option={getChartOption()}
              style={{ height: 300 }}
              opts={{ renderer: 'svg' }}
            />
          </Card>

          {statistics && statistics.moduleStats && (
            <Card size="small" title="模块分布">
              <Row gutter={[16, 16]}>
                {Object.entries(statistics.moduleStats).map(([module, count]: [string, number]) => (
                  <Col span={12} key={module}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>{getModuleInfo(module).label}</Text>
                        <Text strong>{count}</Text>
                      </div>
                      <Progress percent={(count / statistics.totalLogs) * 100} showInfo={false} />
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {statistics && statistics.userStats && statistics.userStats.length > 0 && (
            <Card size="small" title="活跃用户">
              <Row gutter={[16, 16]}>
                {statistics.userStats.slice(0, 10).map((user: { username: string; count: number }) => (
                  <Col span={12} key={user.username}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>{user.username}</Text>
                        <Text strong>{user.count}</Text>
                      </div>
                      <Progress
                        percent={(user.count / statistics.userStats[0].count) * 100}
                        showInfo={false}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {statistics && statistics.trendData && (
            <Card size="small" title="操作趋势">
              <LazyECharts
                option={{
                  tooltip: {
                    trigger: 'axis',
                  },
                  xAxis: {
                    type: 'category',
                    data: statistics.trendData.map((d) => d.date),
                  },
                  yAxis: {
                    type: 'value',
                  },
                  series: [
                    {
                      name: '操作次数',
                      type: 'line',
                      data: statistics.trendData.map((d) => d.count),
                      smooth: true,
                      areaStyle: {},
                    },
                  ],
                }}
                style={{ height: 300 }}
                opts={{ renderer: 'svg' }}
              />
            </Card>
          )}
        </Space>
      </Modal>
    </div>
  );
};

// 辅助组件
const TextWithLabel: React.FC<{
  label: string;
  value: string | number | undefined;
  valueStyle?: React.CSSProperties;
}> = ({ label, value, valueStyle }) => {
  return (
    <div>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {label}:
      </Text>
      <div>
        <Text style={{ fontWeight: 500, ...valueStyle }}>{value ?? '-'}</Text>
      </div>
    </div>
  );
};

export default OperationLogPage;
