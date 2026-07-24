/**
 * React Hook：useComplianceConfirm。
 */
import { Modal } from 'antd';
import type { ModalFuncProps } from 'antd';
import { settingsService } from '@/services';

/** 合规二次确认开关字段名（与 Settings compliance 分组一致） */
export type ComplianceConfirmFlag =
  | 'confirmSensitiveExport'
  | 'confirmSensitiveDelete'
  | 'confirmSensitiveGraphOps'
  | 'confirmSensitiveReindex';

export interface RunWithConfirmOptions {
  /** 确认框标题 */
  title: string;
  /** 确认框内容 */
  content: string;
  /** 确定按钮文案 */
  okText?: string;
  /** 取消按钮文案 */
  cancelText?: string;
  /** 确定按钮额外属性（如 danger） */
  okButtonProps?: ModalFuncProps['okButtonProps'];
  /** 通过确认（或不需要确认）后执行的动作 */
  action: () => void | Promise<void>;
}

/**
 * 读取审计与合规二次确认开关，并在业务操作前按需弹出 Modal。
 *
 * <p>getSettings 失败时默认需要确认（偏安全），与知识图谱重建页行为一致。</p>
 *
 * @returns needsConfirm / runWithConfirm
 */
export function useComplianceConfirm() {
  /**
   * 判断指定合规开关是否要求二次确认。
   *
   * @param flag 合规开关字段
   * @returns true 表示需要确认；接口失败时返回 true
   */
  const needsConfirm = async (flag: ComplianceConfirmFlag): Promise<boolean> => {
    try {
      const settings = await settingsService.getSettings();
      return settings?.compliance?.[flag] !== false;
    } catch {
      return true;
    }
  };

  /**
   * 若开关要求确认则弹 Modal，否则直接执行 action。
   *
   * @param flag 合规开关字段
   * @param options 确认框与动作配置
   */
  const runWithConfirm = async (
    flag: ComplianceConfirmFlag,
    options: RunWithConfirmOptions,
  ): Promise<void> => {
    const need = await needsConfirm(flag);
    if (!need) {
      await options.action();
      return;
    }
    Modal.confirm({
      title: options.title,
      content: options.content,
      okText: options.okText ?? '确定',
      cancelText: options.cancelText ?? '取消',
      okButtonProps: options.okButtonProps,
      onOk: options.action,
    });
  };

  return { needsConfirm, runWithConfirm };
}

export default useComplianceConfirm;
