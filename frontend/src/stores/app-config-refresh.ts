/**
 * 判断是否跳过公共配置拉取。
 *
 * @param loaded 是否已加载过
 * @param force 是否强制刷新
 * @returns true 表示跳过请求
 */
export function shouldSkipAppConfigFetch(loaded: boolean, force?: boolean): boolean {
  return loaded && !force;
}
