import crypto from 'node:crypto';

const SCHEMA_VERSION = '1.0';
const MAX_Q_LENGTH = 50;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const ALLOWED_FEEDBACK_CATEGORIES = new Set(['data_error', 'flow_issue', 'readability', 'other']);

const COMBINATION_SUBJECTS = {
  P_CB: ['PHYSICS', 'CHEMISTRY', 'BIOLOGY'],
  P_CP: ['PHYSICS', 'CHEMISTRY', 'POLITICS'],
  P_CG: ['PHYSICS', 'CHEMISTRY', 'GEOGRAPHY'],
  P_BP: ['PHYSICS', 'BIOLOGY', 'POLITICS'],
  P_BG: ['PHYSICS', 'BIOLOGY', 'GEOGRAPHY'],
  P_PG: ['PHYSICS', 'POLITICS', 'GEOGRAPHY'],
  H_CB: ['HISTORY', 'CHEMISTRY', 'BIOLOGY'],
  H_CP: ['HISTORY', 'CHEMISTRY', 'POLITICS'],
  H_CG: ['HISTORY', 'CHEMISTRY', 'GEOGRAPHY'],
  H_BP: ['HISTORY', 'BIOLOGY', 'POLITICS'],
  H_BG: ['HISTORY', 'BIOLOGY', 'GEOGRAPHY'],
  H_PG: ['HISTORY', 'POLITICS', 'GEOGRAPHY'],
};

function okResponse(requestId, data) {
  return { ok: true, data, requestId: requestId || '', schemaVersion: SCHEMA_VERSION };
}

function errorResponse(requestId, code, message) {
  return {
    ok: false,
    error: { code, message },
    requestId: requestId || '',
    schemaVersion: SCHEMA_VERSION,
  };
}

function matchOffering(subjects, offering) {
  if (!offering || offering.reviewStatus !== 'approved') return 'unknown';
  const { firstSubject, requirementTree } = offering;
  if (!requirementTree || firstSubject === 'UNKNOWN' || requirementTree.type === 'UNKNOWN') {
    return 'unknown';
  }
  const set = new Set(subjects);
  if (firstSubject === 'PHYSICS' && !set.has('PHYSICS')) return 'ineligible';
  if (firstSubject === 'HISTORY' && !set.has('HISTORY')) return 'ineligible';
  if (requirementTree.type === 'NONE') return 'eligible';
  if (requirementTree.type === 'ALL') {
    return requirementTree.subjects.every((s) => set.has(s)) ? 'eligible' : 'ineligible';
  }
  if (requirementTree.type === 'ANY') {
    return requirementTree.subjects.some((s) => set.has(s)) ? 'eligible' : 'ineligible';
  }
  return 'unknown';
}

function encodeCursor(datasetVersion, offset) {
  return Buffer.from(JSON.stringify({ v: datasetVersion, o: offset }), 'utf8').toString('base64');
}

function decodeCursor(cursor) {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    if (typeof parsed.v === 'string' && typeof parsed.o === 'number' && parsed.o >= 0) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function sanitizeText(raw) {
  return String(raw || '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * 统一应用层 Action 处理器（遵循 docs/04_technology.md 契约）：
 * config.get / rules.get / offerings.search / offerings.get / offerings.match / feedback.create
 */
export function createActionDispatcher(store) {
  return async function dispatch(body, clientMeta = {}) {
    const { action, requestId, payload } = body || {};
    if (!action || typeof action !== 'string') {
      return errorResponse(requestId, 'INVALID_INPUT', '缺少 action 参数');
    }
    const safePayload = payload && typeof payload === 'object' ? payload : {};

    try {
      if (action === 'config.get') {
        const manifest = await store.getManifest();
        return okResponse(requestId, {
          supportedProvinces: manifest.supportedProvinces,
          availableYears: manifest.supportedProvinces[0]?.availableYears || [2027],
          currentManifest: manifest,
          featureFlags: manifest.featureFlags,
        });
      }

      if (action === 'rules.get') {
        const { provinceCode, ruleVersion } = safePayload;
        if (!provinceCode || typeof provinceCode !== 'string') {
          return errorResponse(requestId, 'INVALID_INPUT', '缺少 provinceCode');
        }
        const rule = await store.getProvinceRule(provinceCode, ruleVersion);
        if (!rule) {
          return errorResponse(requestId, 'UNSUPPORTED_PROVINCE', '该省份暂未开放');
        }
        const source = await store.getSourceById(rule.sourceId);
        return okResponse(requestId, { rule, source });
      }

      if (action === 'offerings.search') {
        const { provinceCode, datasetVersion, q, combinationId, cursor, pageSize } = safePayload;
        if (!provinceCode || !datasetVersion) {
          return errorResponse(requestId, 'INVALID_INPUT', '缺少省份或数据版本参数');
        }
        const cleanedQ = typeof q === 'string' ? q.trim() : '';
        if (cleanedQ.length > MAX_Q_LENGTH) {
          return errorResponse(requestId, 'INVALID_INPUT', `搜索词长度不能超过 ${MAX_Q_LENGTH} 字`);
        }
        if (/[*?\\[\]^$()]/.test(cleanedQ)) {
          return errorResponse(requestId, 'INVALID_INPUT', '搜索词不支持通配符或正则符号');
        }
        if (combinationId && !COMBINATION_SUBJECTS[combinationId]) {
          return errorResponse(requestId, 'INVALID_INPUT', '非法的组合编码');
        }

        const dataset = await store.getDataset(provinceCode, datasetVersion);
        if (!dataset) {
          return errorResponse(requestId, 'DATASET_NOT_FOUND', '未找到对应的数据版本');
        }

        let offset = 0;
        if (cursor) {
          const decoded = decodeCursor(cursor);
          if (!decoded) {
            return errorResponse(requestId, 'INVALID_INPUT', '分页游标无效');
          }
          if (decoded.v !== dataset.version) {
            return errorResponse(requestId, 'DATASET_CHANGED', '专业数据版本已更新，请刷新后重试');
          }
          offset = decoded.o;
        }

        const limit = Math.min(
          Math.max(1, Number.isInteger(pageSize) ? pageSize : DEFAULT_PAGE_SIZE),
          MAX_PAGE_SIZE
        );

        const { items: pagedRaw, total: totalMatched } = await store.searchOfferingsPage({
          datasetId: dataset.id,
          q: cleanedQ,
          offset,
          limit,
        });

        const comboSubjects = combinationId ? COMBINATION_SUBJECTS[combinationId] : null;
        const pageItems = pagedRaw.map((item) => ({
          ...item,
          dataYear: dataset.dataYear,
          matchStatus: comboSubjects ? matchOffering(comboSubjects, item) : null,
        }));

        const nextOffset = offset + limit;
        const nextCursor = nextOffset < totalMatched ? encodeCursor(dataset.version, nextOffset) : null;
        const sources = await store.getSourcesByIds(dataset.sourceIds || []);

        return okResponse(requestId, {
          items: pageItems,
          nextCursor,
          totalMatched,
          scope: {
            datasetVersion: dataset.version,
            dataYear: dataset.dataYear,
            completeness: dataset.completeness,
            scopeNote: dataset.scopeNote,
            isDemo: Boolean(dataset.isDemo),
          },
          sourceSummary: sources,
        });
      }

      if (action === 'offerings.get') {
        const { id, datasetVersion } = safePayload;
        if (!id || !datasetVersion) {
          return errorResponse(requestId, 'INVALID_INPUT', '缺少条目 ID 或数据版本');
        }
        const offering = await store.getOfferingById(id, datasetVersion);
        if (!offering) {
          return errorResponse(requestId, 'DATASET_NOT_FOUND', '未找到对应专业条目');
        }
        const dataset = await store.getDatasetById(offering.datasetId);
        const sources = dataset ? await store.getSourcesByIds(dataset.sourceIds || []) : [];
        return okResponse(requestId, { offering, dataset, sources });
      }

      if (action === 'offerings.match') {
        const { provinceCode, datasetVersion, examYear, majorIds, combinationIds } = safePayload;
        if (!provinceCode || !datasetVersion) {
          return errorResponse(requestId, 'INVALID_INPUT', '缺少省份或数据版本');
        }
        if (!Array.isArray(majorIds) || majorIds.length === 0 || majorIds.length > 3) {
          return errorResponse(requestId, 'INVALID_INPUT', 'majorIds 必须为 1 至 3 个专业标识');
        }
        if (!Array.isArray(combinationIds) || combinationIds.length === 0 || combinationIds.length > 12) {
          return errorResponse(requestId, 'INVALID_INPUT', 'combinationIds 必须为 1 至 12 个合法组合');
        }
        for (const cid of combinationIds) {
          if (!COMBINATION_SUBJECTS[cid]) {
            return errorResponse(requestId, 'INVALID_INPUT', `非法组合编码: ${cid}`);
          }
        }

        const dataset = await store.getDataset(provinceCode, datasetVersion);
        if (!dataset) {
          return errorResponse(requestId, 'DATASET_NOT_FOUND', '未找到对应数据版本');
        }

        const isReferenceYear =
          examYear === null ||
          examYear === undefined ||
          !Array.isArray(dataset.applicableYears) ||
          !dataset.applicableYears.includes(examYear);

        const canHardFilter =
          !isReferenceYear &&
          dataset.completeness === 'full' &&
          !dataset.isDemo &&
          dataset.status === 'published';

        const allOfferings = await store.getOfferingsByMajorIds(dataset.id, majorIds);
        const byCombination = {};

        for (const cid of combinationIds) {
          const subjects = COMBINATION_SUBJECTS[cid];
          byCombination[cid] = {};
          for (const majorId of majorIds) {
            const related = allOfferings.filter(
              (o) => o.majorId === majorId || o.majorName === majorId
            );
            let eligibleCount = 0;
            let ineligibleCount = 0;
            let unknownCount = 0;
            for (const off of related) {
              const st = matchOffering(subjects, off);
              if (st === 'eligible') eligibleCount += 1;
              else if (st === 'ineligible') ineligibleCount += 1;
              else unknownCount += 1;
            }

            let status = 'unknown';
            let summaryText = '该方向资料尚不充分，暂无法判定';
            if (related.length > 0) {
              if (eligibleCount > 0) {
                status = 'eligible';
                summaryText = isReferenceYear
                  ? `参考 ${dataset.dataYear} 年资料，有 ${eligibleCount} 所院校条目满足选科条件`
                  : `满足 ${eligibleCount} / ${related.length} 条已知选科条件`;
              } else if (unknownCount > 0) {
                status = 'unknown';
                summaryText = '部分条目待核实，暂不判定为不可报';
              } else {
                status = 'ineligible';
                summaryText = isReferenceYear
                  ? `参考 ${dataset.dataYear} 年资料，当前收录条目均不满足`
                  : `当前收录的 ${related.length} 条均不满足选科条件`;
              }
            }

            byCombination[cid][majorId] = {
              majorId,
              majorName: related[0]?.majorName || majorId,
              status,
              eligibleCount,
              ineligibleCount,
              unknownCount,
              totalCount: related.length,
              isReferenceYear,
              referenceYear: isReferenceYear ? dataset.dataYear : null,
              dataYear: dataset.dataYear,
              completeness: dataset.completeness,
              canHardFilter,
              summaryText,
            };
          }
        }

        return okResponse(requestId, {
          datasetVersion: dataset.version,
          dataYear: dataset.dataYear,
          isReferenceYear,
          completeness: dataset.completeness,
          canHardFilter,
          cannotHardFilter: !canHardFilter,
          scopeNote: dataset.scopeNote,
          isDemo: Boolean(dataset.isDemo),
          byCombination,
        });
      }

      if (action === 'feedback.create') {
        if (!ALLOWED_FEEDBACK_CATEGORIES.has(safePayload.category)) {
          return errorResponse(requestId, 'INVALID_INPUT', '请选择有效的反馈分类');
        }
        const message = sanitizeText(safePayload.message);
        if (message.length < 10 || message.length > 500) {
          return errorResponse(requestId, 'INVALID_INPUT', '反馈内容需在 10 至 500 字之间');
        }

        const actorIp = clientMeta.ip || 'anonymous';
        const rateKey = crypto.createHash('sha256').update(actorIp).digest('hex').slice(0, 16);
        const allowed = await store.checkRateLimit(rateKey);
        if (!allowed) {
          return errorResponse(requestId, 'RATE_LIMITED', '提交过于频繁，请稍后再试');
        }

        const feedbackId = `fb_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
        await store.saveFeedback({
          feedbackId,
          category: safePayload.category,
          message,
          offeringId: typeof safePayload.offeringId === 'string' ? safePayload.offeringId.slice(0, 64) : null,
          datasetVersion:
            typeof safePayload.datasetVersion === 'string'
              ? safePayload.datasetVersion.slice(0, 64)
              : null,
          createdAt: new Date().toISOString(),
        });

        return okResponse(requestId, { feedbackId });
      }

      return errorResponse(requestId, 'INVALID_INPUT', `未知 action: ${action}`);
    } catch {
      return errorResponse(requestId, 'INTERNAL_ERROR', '服务暂时不可用，请稍后重试');
    }
  };
}
