/**
 * 业务页面：ExportDataPage。
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Radio,
  Row,
  Col,
  Typography,
  Alert,
  Tag,
} from 'antd';
import { App } from 'antd';
import { useComplianceConfirm } from '@/hooks';
import {
  FileTextOutlined,
  FilePdfOutlined,
  FileMarkdownOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { documentService } from '@/services';
import { Document } from '@/types';

const { Title, Text } = Typography;

/**
 * ExportDataPage 页面组件。
 */
const ExportDataPage: React.FC = () => {
  const { message } = App.useApp();
  const { runWithConfirm } = useComplianceConfirm();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'markdown'>('pdf');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  /**
   * fetchDocuments。
   */
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await documentService.getDocuments({
        keyword: keyword || undefined,
        status: statusFilter,
        page: pagination.current,
        pageSize: pagination.pageSize,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
      setDocuments(result.list);
      setTotal(result.total);
    } catch {
      message.error('获取文档列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, message, pagination, statusFilter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  /**
   * 批量导出选中文档；尊重合规「导出二次确认」开关。
   */
  const handleExport = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要导出的文档');
      return;
    }

    const ids = selectedRowKeys.map(String);
    const formatLabel = exportFormat === 'pdf' ? 'PDF' : 'Markdown';

    /**
     * 执行批量导出请求。
     */
    const doExport = async () => {
      setExporting(true);
      try {
        await documentService.batchExportDocuments(ids, exportFormat);
        message.success(`成功导出 ${ids.length} 个文档`);
      } catch {
        message.error('导出失败，请重试');
      } finally {
        setExporting(false);
      }
    };

    await runWithConfirm('confirmSensitiveExport', {
      title: `确认批量导出 ${formatLabel}？`,
      content: `将导出已选中的 ${ids.length} 个文档为 ${formatLabel}。`,
      okText: '确认导出',
      action: doExport,
    });
  };

  const handleClearSelection = () => {
    setSelectedRowKeys([]);
  };

  const handleTableChange = (pag: any) => {
    setPagination({ current: pag.current, pageSize: pag.pageSize });
  };

  const statusMap: Record<number, { label: string; color: string }> = {
    0: { label: '草稿', color: 'default' },
    1: { label: '已发布', color: 'green' },
    2: { label: '已归档', color: 'orange' },
    3: { label: '待审核', color: 'blue' },
  };

  const columns: ColumnsType<Document> = [
    {
      title: '文档标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string) => (
        <Space>
          <FileTextOutlined style={{ color: '#2563eb' }} />
          <Text ellipsis={{ tooltip: text }} style={{ maxWidth: 300 }}>
            {text}
          </Text>
        </Space>
      ),
    },
    {
      title: '作者',
      dataIndex: 'authorName',
      key: 'authorName',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number) => {
        const info = statusMap[status] || { label: '未知', color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (time: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
      sorter: true,
    },
  ];

  const hasSelected = selectedRowKeys.length > 0;

  return (
    <div style={{ padding: '16px 16px 32px 16px', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={1} style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', marginBottom: 8, letterSpacing: '-0.02em' }}>
            导出数据
          </Title>
          <Text style={{ fontSize: 16, color: '#475569' }}>
            选择文档并导出为 PDF 或 Markdown 格式的 ZIP 压缩包
          </Text>
        </div>
      </div>

      {/* Filter Bar */}
      <Card style={{ borderRadius: 12, marginBottom: 16, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} variant="borderless">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} lg={6}>
            <Input
              placeholder="搜索文档标题"
              allowClear
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
            />
          </Col>
          <Col xs={24} sm={6} lg={4}>
            <Select
              placeholder="文档状态"
              allowClear
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(val: number | string | null) => {
                setStatusFilter(val == null || val === 'all' ? undefined : Number(val));
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
            >
              <Select.Option value="all">全部状态</Select.Option>
              <Select.Option value={0}>草稿</Select.Option>
              <Select.Option value={1}>已发布</Select.Option>
              <Select.Option value={2}>已归档</Select.Option>
              <Select.Option value={3}>待审核</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={10} lg={14}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchDocuments}>
                刷新
              </Button>
              {hasSelected && (
                <>
                  <Button icon={<ClearOutlined />} onClick={handleClearSelection}>
                    取消选择
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Export Config Bar */}
      <Card style={{ borderRadius: 12, marginBottom: 16, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} variant="borderless">
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} md={14}>
            <Space size="middle">
              <Text strong>导出格式：</Text>
              <Radio.Group value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                <Radio.Button value="pdf">
                  <Space>
                    <FilePdfOutlined />
                    PDF
                  </Space>
                </Radio.Button>
                <Radio.Button value="markdown">
                  <Space>
                    <FileMarkdownOutlined />
                    Markdown
                  </Space>
                </Radio.Button>
              </Radio.Group>
            </Space>
          </Col>
          <Col xs={24} md={10}>
            <Space style={{ float: 'right' }}>
              {hasSelected && (
                <Text style={{ color: '#2563eb', fontWeight: 500 }}>
                  已选择 <Text strong style={{ fontSize: 18 }}>{selectedRowKeys.length}</Text> 个文档
                </Text>
              )}
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={exporting}
                disabled={!hasSelected}
                size="large"
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                  border: 'none',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.15)',
                }}
              >
                导出选中文档
              </Button>
            </Space>
          </Col>
        </Row>
        {selectedRowKeys.length > 0 && (
          <Alert
            message={`将导出 ${selectedRowKeys.length} 个文档为 ${exportFormat.toUpperCase()} 格式的 ZIP 压缩包`}
            type="info"
            showIcon
            style={{ marginTop: 12 }}
          />
        )}
      </Card>

      {/* Document Table */}
      <Card style={{ borderRadius: 12, border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} variant="borderless">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={documents}
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          onChange={handleTableChange}
          pagination={{
            ...pagination,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
          scroll={{ x: 600 }}
        />
      </Card>
    </div>
  );
};

export default ExportDataPage;
