-- =====================================================
-- 敏感词种子 + 菜单权限（可重复执行）
-- L1：kb_sensitive_word；L1.5：regex / homophone
-- 说明：演示/联调用例词表，非完整合规词库
-- =====================================================
SET NAMES utf8mb4;

USE `kb_foundation`;

-- ---------- L1 词库（演示/常见垃圾营销与违规示意，非完整合规词表）----------
INSERT IGNORE INTO `kb_sensitive_word`
(`id`, `word`, `category`, `action`, `replace_to`, `enabled`, `remark`, `deleted`) VALUES
(7100000000000000001, '免费领取', 'spam', 'block', NULL, 1, '营销诱导', 0),
(7100000000000000002, '加微信', 'spam', 'replace', '***', 1, '导流', 0),
(7100000000000000003, '加V', 'spam', 'replace', '***', 1, '导流简写', 0),
(7100000000000000004, '刷单', 'spam', 'block', NULL, 1, '灰色兼职', 0),
(7100000000000000005, '日赚千元', 'spam', 'audit', NULL, 1, '夸大收益', 0),
(7100000000000000006, '代开发票', 'ad', 'block', NULL, 1, '违规广告', 0),
(7100000000000000007, '办证', 'ad', 'block', NULL, 1, '违规办证', 0),
(7100000000000000008, '色情', 'porn', 'block', NULL, 1, '演示分类', 0),
(7100000000000000009, '裸体', 'porn', 'block', NULL, 1, '演示分类', 0),
(7100000000000000010, '赌博', 'gambling', 'block', NULL, 1, '演示分类', 0),
(7100000000000000011, '百家乐', 'gambling', 'block', NULL, 1, '演示分类', 0),
(7100000000000000012, '六合彩', 'gambling', 'block', NULL, 1, '演示分类', 0),
(7100000000000000013, '博彩', 'gambling', 'block', NULL, 1, '演示分类', 0),
(7100000000000000014, '操你', 'abuse', 'replace', '**', 1, '辱骂', 0),
(7100000000000000015, '傻逼', 'abuse', 'replace', '**', 1, '辱骂', 0),
(7100000000000000016, '去死', 'abuse', 'block', NULL, 1, '人身攻击', 0),
(7100000000000000017, '枪支弹药', 'custom', 'block', NULL, 1, '危险品示意', 0),
(7100000000000000018, '爆炸物', 'custom', 'block', NULL, 1, '危险品示意', 0),
(7100000000000000019, '假币', 'custom', 'block', NULL, 1, '违法示意', 0),
(7100000000000000020, '洗钱', 'custom', 'block', NULL, 1, '违法示意', 0),
(7100000000000000021, '内部消息稳赚', 'spam', 'block', NULL, 1, '荐股诱导', 0),
(7100000000000000022, '点击领红包', 'spam', 'audit', NULL, 1, '营销', 0),
(7100000000000000023, '代考', 'ad', 'block', NULL, 1, '学术不端', 0),
(7100000000000000024, '论文代写', 'ad', 'block', NULL, 1, '学术不端', 0),
(7100000000000000025, '测试违禁词ALPHA', 'custom', 'block', NULL, 1, '联调用例', 0),
(7100000000000000026, '测试违禁词BETA', 'custom', 'replace', '[已屏蔽]', 1, '联调用例-替换', 0),
(7100000000000000027, '薇信', 'spam', 'replace', '***', 1, '谐音导流（配合谐音表）', 0),
(7100000000000000028, '微♥信', 'spam', 'replace', '***', 1, '插符导流（归一化后命中微信类）', 0),
(7100000000000000029, '赌搏', 'gambling', 'block', NULL, 1, '形近字示意', 0),
(7100000000000000030, '黄色网站', 'porn', 'block', NULL, 1, '演示', 0),
(7100000000000000031, '私聊领优惠', 'spam', 'block', NULL, 1, '导流营销', 0),
(7100000000000000032, '限时秒杀', 'spam', 'audit', NULL, 1, '营销话术', 0),
(7100000000000000033, '零成本创业', 'spam', 'block', NULL, 1, '夸大承诺', 0),
(7100000000000000034, '稳赚不赔', 'spam', 'block', NULL, 1, '荐股诱导', 0),
(7100000000000000035, '百分百回本', 'spam', 'block', NULL, 1, '夸大收益', 0),
(7100000000000000036, '兼职日结', 'spam', 'audit', NULL, 1, '灰色兼职', 0),
(7100000000000000037, '代理招商', 'ad', 'audit', NULL, 1, '招商广告', 0),
(7100000000000000038, '发票代开', 'ad', 'block', NULL, 1, '违规广告', 0),
(7100000000000000039, '假证办理', 'ad', 'block', NULL, 1, '违规办证', 0),
(7100000000000000040, '刻章办证', 'ad', 'block', NULL, 1, '违规办证', 0),
(7100000000000000041, '贷款秒批', 'spam', 'block', NULL, 1, '金融诱导', 0),
(7100000000000000042, '无抵押放款', 'spam', 'block', NULL, 1, '金融诱导', 0),
(7100000000000000043, '色情服务', 'porn', 'block', NULL, 1, '演示分类', 0),
(7100000000000000044, '约炮', 'porn', 'block', NULL, 1, '演示分类', 0),
(7100000000000000045, '成人视频', 'porn', 'block', NULL, 1, '演示分类', 0),
(7100000000000000046, '赌场', 'gambling', 'block', NULL, 1, '演示分类', 0),
(7100000000000000047, '赌球', 'gambling', 'block', NULL, 1, '演示分类', 0),
(7100000000000000048, '开户送彩金', 'gambling', 'block', NULL, 1, '博彩营销', 0),
(7100000000000000049, '操你妈', 'abuse', 'replace', '**', 1, '辱骂', 0),
(7100000000000000050, '白痴', 'abuse', 'replace', '**', 1, '辱骂', 0),
(7100000000000000051, '脑残', 'abuse', 'replace', '**', 1, '辱骂', 0),
(7100000000000000052, '滚蛋', 'abuse', 'audit', NULL, 1, '轻度辱骂', 0),
(7100000000000000081, '煞笔', 'abuse', 'replace', '**', 1, '辱骂谐音变体', 0),
(7100000000000000082, '傻B', 'abuse', 'replace', '**', 1, '辱骂变体', 0),
(7100000000000000083, '沙比', 'abuse', 'replace', '**', 1, '辱骂谐音', 0),
(7100000000000000084, '艹你', 'abuse', 'replace', '**', 1, '辱骂变体', 0),
(7100000000000000053, '毒品', 'custom', 'block', NULL, 1, '违禁品示意', 0),
(7100000000000000054, '冰毒', 'custom', 'block', NULL, 1, '违禁品示意', 0),
(7100000000000000055, '海洛因', 'custom', 'block', NULL, 1, '违禁品示意', 0),
(7100000000000000056, '制毒', 'custom', 'block', NULL, 1, '违禁品示意', 0),
(7100000000000000057, '贩卖人口', 'custom', 'block', NULL, 1, '违法示意', 0),
(7100000000000000058, '偷税漏税', 'custom', 'block', NULL, 1, '违法示意', 0),
(7100000000000000059, '传销', 'custom', 'block', NULL, 1, '违法示意', 0),
(7100000000000000060, '金字塔骗局', 'custom', 'block', NULL, 1, '违法示意', 0),
(7100000000000000061, '加我微信', 'spam', 'replace', '***', 1, '导流', 0),
(7100000000000000062, '扫码加好友', 'spam', 'replace', '***', 1, '导流', 0),
(7100000000000000063, '私信领取', 'spam', 'block', NULL, 1, '导流营销', 0),
(7100000000000000064, '点击下方链接', 'spam', 'audit', NULL, 1, '外链诱导', 0),
(7100000000000000065, '木马病毒', 'custom', 'block', NULL, 1, '安全威胁示意', 0),
(7100000000000000066, '钓鱼网站', 'custom', 'block', NULL, 1, '安全威胁示意', 0),
(7100000000000000067, '勒索软件', 'custom', 'block', NULL, 1, '安全威胁示意', 0),
(7100000000000000068, '破解版下载', 'ad', 'audit', NULL, 1, '侵权软件', 0),
(7100000000000000069, '免费破解', 'ad', 'block', NULL, 1, '侵权软件', 0),
(7100000000000000070, '代孕', 'ad', 'block', NULL, 1, '违规服务', 0),
(7100000000000000071, '器官买卖', 'custom', 'block', NULL, 1, '违法示意', 0),
(7100000000000000072, '自杀教程', 'custom', 'block', NULL, 1, '危险内容', 0),
(7100000000000000073, '如何造假', 'custom', 'block', NULL, 1, '违法示意', 0),
(7100000000000000074, '翻墙软件', 'custom', 'audit', NULL, 1, '视策略可调', 0),
(7100000000000000075, 'VPN加速器破解', 'custom', 'audit', NULL, 1, '视策略可调', 0),
(7100000000000000076, '内部渠道出货', 'spam', 'block', NULL, 1, '灰色交易', 0),
(7100000000000000077, '水军刷评', 'spam', 'block', NULL, 1, '灰产', 0),
(7100000000000000078, '刷好评', 'spam', 'block', NULL, 1, '灰产', 0),
(7100000000000000079, '删差评', 'spam', 'audit', NULL, 1, '灰产', 0),
(7100000000000000080, '测试违禁词GAMMA', 'custom', 'audit', NULL, 1, '联调用例-审计', 0);

-- ---------- L1.5 正则 ----------
INSERT IGNORE INTO `kb_sensitive_regex`
(`id`, `name`, `pattern`, `category`, `action`, `replace_to`, `enabled`, `remark`, `deleted`) VALUES
(7100000000000000101, '大陆手机号', '1[3-9]\\d{9}', 'privacy', 'replace', '[手机号]', 1, '连续11位手机号', 0),
(7100000000000000102, '身份证号粗检', '[1-9]\\d{5}(?:19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]', 'privacy', 'replace', '[证件号]', 1, '18位身份证粗匹配', 0),
(7100000000000000103, '邮箱地址', '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}', 'privacy', 'audit', NULL, 1, '可选审计', 0),
(7100000000000000104, '银行卡粗检', '(?:62|4\\d|5[1-5])\\d{14,17}', 'privacy', 'audit', NULL, 0, '默认关闭防误杀', 0);

-- ---------- L1.5 谐音/形近 ----------
INSERT IGNORE INTO `kb_sensitive_homophone`
(`id`, `src`, `dst`, `enabled`, `remark`, `deleted`) VALUES
(7100000000000000201, '薇', '微', 1, '薇信→微信', 0),
(7100000000000000202, '威', '微', 1, '威信→微信', 0),
(7100000000000000203, '搏', '博', 1, '赌搏→赌博', 0),
(7100000000000000204, '囯', '国', 1, '形近', 0),
(7100000000000000205, '厺', '去', 1, '形近', 0),
(7100000000000000206, '煞', '傻', 1, '煞笔→傻逼', 0),
(7100000000000000207, '沙', '傻', 1, '沙比→傻逼（部分语境）', 0);

-- 开关配置
INSERT INTO `kb_system_config`
(`id`, `config_key`, `config_value`, `config_type`, `category`, `description`, `is_public`, `deleted`)
SELECT 7100000000000000301, 'sensitive.filter.enabled', 'true', 'boolean', 'SECURITY', '是否启用敏感词过滤（L1+L1.5）', 0, 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `kb_system_config` WHERE `config_key` = 'sensitive.filter.enabled' AND `deleted` = 0);

INSERT INTO `kb_system_config`
(`id`, `config_key`, `config_value`, `config_type`, `category`, `description`, `is_public`, `deleted`)
SELECT 7100000000000000302, 'sensitive.normalize.enabled', 'true', 'boolean', 'SECURITY', '是否启用归一化（去空白/全半角/谐音）', 0, 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `kb_system_config` WHERE `config_key` = 'sensitive.normalize.enabled' AND `deleted` = 0);

USE `kb_user`;

-- 菜单：系统管理下「敏感词」
INSERT INTO `kb_permission`
(`id`, `parent_id`, `permission_name`, `permission_code`, `permission_type`, `menu_url`, `icon`, `sort`, `status`, `deleted`)
SELECT 3000000000000000060, 3000000000000000008, '敏感词管理', 'system:sensitive-word', 1, '/admin/sensitive-words', NULL, 11, 1, 0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `kb_permission` WHERE `permission_code` = 'system:sensitive-word' AND `deleted` = 0
);

-- 超管绑定（kb_role_permission 无 deleted 列）
INSERT INTO `kb_role_permission` (`id`, `role_id`, `permission_id`)
SELECT 4000000000000000160, 2000000000000000001, p.id
FROM `kb_permission` p
WHERE p.`permission_code` = 'system:sensitive-word' AND p.`deleted` = 0
  AND NOT EXISTS (
    SELECT 1 FROM `kb_role_permission` rp
    WHERE rp.`role_id` = 2000000000000000001 AND rp.`permission_id` = p.id
  );
