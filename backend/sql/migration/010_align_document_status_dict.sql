-- =====================================================
-- 010: document_status 字典与 DocumentStatus 枚举对齐
-- 枚举：0草稿 1已发布 2已归档 3待审核（无「已驳回」文档状态，驳回回草稿）
-- =====================================================

USE `kb_foundation`;

UPDATE `kb_dict`
SET `description` = '文档状态：草稿/已发布/已归档/待审核'
WHERE `dict_code` = 'document_status';

UPDATE `kb_dict_data`
SET `dict_label` = '草稿', `dict_value` = '0', `dict_sort` = 1, `css_class` = 'badge-gray', `is_default` = 1
WHERE `id` = 3100000000000000001;

UPDATE `kb_dict_data`
SET `dict_label` = '已发布', `dict_value` = '1', `dict_sort` = 2, `css_class` = 'badge-green', `is_default` = 0
WHERE `id` = 3100000000000000002;

UPDATE `kb_dict_data`
SET `dict_label` = '已归档', `dict_value` = '2', `dict_sort` = 3, `css_class` = 'badge-blue', `is_default` = 0
WHERE `id` = 3100000000000000003;

UPDATE `kb_dict_data`
SET `dict_label` = '待审核', `dict_value` = '3', `dict_sort` = 4, `css_class` = 'badge-yellow', `is_default` = 0
WHERE `id` = 3100000000000000004;

SELECT '010_align_document_status_dict 执行完成' AS message;
