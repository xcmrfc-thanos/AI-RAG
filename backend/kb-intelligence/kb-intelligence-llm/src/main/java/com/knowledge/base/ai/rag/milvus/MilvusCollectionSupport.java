package com.knowledge.base.ai.rag.milvus;

import com.knowledge.base.ai.config.RagProperties;
import io.milvus.client.MilvusServiceClient;
import io.milvus.grpc.DataType;
import io.milvus.param.IndexType;
import io.milvus.param.MetricType;
import io.milvus.param.R;
import io.milvus.param.RpcStatus;
import io.milvus.param.collection.CreateCollectionParam;
import io.milvus.param.collection.FieldType;
import io.milvus.param.collection.HasCollectionParam;
import io.milvus.param.collection.LoadCollectionParam;
import io.milvus.param.index.CreateIndexParam;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Milvus collection 建表 / 加载（dense + 可选 sparse）。
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnBean(MilvusServiceClient.class)
public class MilvusCollectionSupport {

    /** dense 字段名 */
    public static final String FIELD_DENSE = "embedding";
    /** sparse 字段名 */
    public static final String FIELD_SPARSE = "sparse_embedding";

    private final MilvusServiceClient milvusClient;
    private final RagProperties ragProperties;

    /**
     * 集合是否存在。
     *
     * @return true 存在
     */
    public boolean collectionExists() {
        R<Boolean> response = milvusClient.hasCollection(HasCollectionParam.newBuilder()
                .withCollectionName(collectionName())
                .build());
        return response.getStatus() == R.Status.Success.getCode() && Boolean.TRUE.equals(response.getData());
    }

    /**
     * 确保集合存在；可选创建 sparse 字段与索引。
     *
     * @param includeSparse true 时建 sparse_embedding（milvus-milvus）
     */
    public void ensureCollection(boolean includeSparse) {
        if (collectionExists()) {
            loadCollection();
            return;
        }
        int dimension = ragProperties.getEmbedding().getDimension();
        List<FieldType> fields = new ArrayList<>();
        fields.add(FieldType.newBuilder().withName("chunk_id").withDataType(DataType.VarChar)
                .withMaxLength(64).withPrimaryKey(true).build());
        fields.add(FieldType.newBuilder().withName("document_id").withDataType(DataType.Int64).build());
        fields.add(FieldType.newBuilder().withName("document_title").withDataType(DataType.VarChar)
                .withMaxLength(512).build());
        fields.add(FieldType.newBuilder().withName("content").withDataType(DataType.VarChar)
                .withMaxLength(65535).build());
        fields.add(FieldType.newBuilder().withName("heading").withDataType(DataType.VarChar)
                .withMaxLength(512).build());
        fields.add(FieldType.newBuilder().withName("chunk_index").withDataType(DataType.Int32).build());
        fields.add(FieldType.newBuilder().withName("total_chunks").withDataType(DataType.Int32).build());
        fields.add(FieldType.newBuilder().withName("category_id").withDataType(DataType.Int64).build());
        fields.add(FieldType.newBuilder().withName("author_id").withDataType(DataType.Int64).build());
        fields.add(FieldType.newBuilder().withName("team_id").withDataType(DataType.Int64).build());
        fields.add(FieldType.newBuilder().withName("doc_status").withDataType(DataType.Int32).build());
        fields.add(FieldType.newBuilder().withName("publish_time").withDataType(DataType.VarChar)
                .withMaxLength(64).build());
        fields.add(FieldType.newBuilder().withName(FIELD_DENSE).withDataType(DataType.FloatVector)
                .withDimension(dimension).build());
        if (includeSparse) {
            fields.add(FieldType.newBuilder().withName(FIELD_SPARSE)
                    .withDataType(DataType.SparseFloatVector).build());
        }

        R<RpcStatus> createResponse = milvusClient.createCollection(CreateCollectionParam.newBuilder()
                .withCollectionName(collectionName())
                .withFieldTypes(fields)
                .build());
        if (createResponse.getStatus() != R.Status.Success.getCode()) {
            throw new RuntimeException("Milvus 创建集合失败：" + createResponse.getMessage());
        }

        R<RpcStatus> denseIndex = milvusClient.createIndex(CreateIndexParam.newBuilder()
                .withCollectionName(collectionName())
                .withFieldName(FIELD_DENSE)
                .withIndexType(IndexType.AUTOINDEX)
                .withMetricType(MetricType.COSINE)
                .build());
        if (denseIndex.getStatus() != R.Status.Success.getCode()) {
            throw new RuntimeException("Milvus 创建 dense 索引失败：" + denseIndex.getMessage());
        }

        if (includeSparse) {
            R<RpcStatus> sparseIndex = milvusClient.createIndex(CreateIndexParam.newBuilder()
                    .withCollectionName(collectionName())
                    .withFieldName(FIELD_SPARSE)
                    .withIndexType(IndexType.SPARSE_INVERTED_INDEX)
                    .withMetricType(MetricType.IP)
                    .withExtraParam("{\"drop_ratio_build\":0.2}")
                    .build());
            if (sparseIndex.getStatus() != R.Status.Success.getCode()) {
                throw new RuntimeException("Milvus 创建 sparse 索引失败：" + sparseIndex.getMessage());
            }
        }

        loadCollection();
        log.info("Milvus 集合创建成功：collection={}, sparse={}", collectionName(), includeSparse);
    }

    /**
     * 加载集合到内存。
     */
    public void loadCollection() {
        milvusClient.loadCollection(LoadCollectionParam.newBuilder()
                .withCollectionName(collectionName())
                .build());
    }

    /**
     * 集合名。
     *
     * @return collection
     */
    public String collectionName() {
        return ragProperties.getMilvus().getCollection();
    }
}
