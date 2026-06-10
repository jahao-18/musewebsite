from main import PipelineRequest, PolishRequest, run_full_pipeline, polish_text
from nlp_engine import (
    analyze_sentiment,
    expand_query,
    extract_keywords,
    get_knowledge_page,
    retrieve_similar,
    segment,
)


failures = []


def check(name, condition, detail):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {name}: {detail}")
    if not condition:
        failures.append((name, detail))


def main():
    # 1. 历史 bug：量词残片不应进入关键词。
    text = "地铁啃食着城市的肋骨，人群中的一张张脸"
    seg = segment(text)
    kw = extract_keywords(seg["words"], 10)
    kw_words = [k["keyword"] for k in kw]
    check(
        "量词残片过滤",
        "张脸" not in seg["words"] and "一张" not in seg["words"] and "张脸" not in kw_words,
        f"words={seg['words']}, keywords={kw_words}",
    )
    check(
        "城市意象保留",
        all(w in seg["words"] for w in ["地铁", "城市", "肋骨", "人群"]),
        f"words={seg['words']}",
    )

    # 2. 历史偏差：短复合主题要拆解并扩展。
    seg2 = segment("校园爱情")
    exp2 = expand_query("校园爱情", seg2["words"])
    check(
        "校园爱情主题拆解",
        {"校园", "爱情", "青春", "初恋"}.issubset(set(exp2["expanded"])),
        f"expanded={exp2['expanded']}",
    )
    emo2 = analyze_sentiment(exp2["expanded"])
    check(
        "校园爱情情绪不应平静兜底",
        emo2["dominant"] in ["喜悦", "怀旧"],
        f"emotion={emo2}",
    )

    # 3. 递进情绪词：幸福甜美校园爱情应明显喜悦。
    seg3 = segment("幸福甜美的校园爱情")
    exp3 = expand_query("幸福甜美的校园爱情", seg3["words"])
    emo3 = analyze_sentiment(exp3["expanded"])
    check(
        "幸福甜美情绪识别",
        emo3["dominant"] == "喜悦" and emo3["intensity"] > 0,
        f"expanded={exp3['expanded']}, emotion={emo3}",
    )

    # 4. BM25 检索：不能全空，且要给命中词方便解释。
    sim = retrieve_similar(exp3["expanded"], "现代诗", 5)
    check("BM25检索有结果", len(sim) > 0, f"count={len(sim)}")
    check("BM25命中词返回", any(s.get("matchedTerms") for s in sim), f"top={sim[:1]}")

    # 5. Pipeline LLM 关闭降级：结构完整，不能误调用。
    pipe = run_full_pipeline(
        PipelineRequest(topic="幸福甜美的校园爱情", creationType="现代诗", useLLM=False)
    )
    check(
        "Pipeline结构完整",
        all(
            k in pipe
            for k in [
                "queryExpansion",
                "keywords",
                "emotion",
                "similarWorks",
                "generated",
                "generatedLLM",
            ]
        ),
        f"keys={list(pipe.keys())}",
    )
    check(
        "Pipeline关闭LLM降级",
        "未启用" in pipe["generatedLLM"]["method"],
        f"method={pipe['generatedLLM']['method']}",
    )

    # 6. Knowledge API：标签非单字、分页和空搜索稳定。
    kb = get_knowledge_page(page=1, page_size=10, search="", emotion="all", poem_type="all")
    labels = [kw for item in kb["items"] for kw in item.get("keywords", [])]
    check(
        "知识库分页统计",
        kb["stats"]["total"] == 5320 and len(kb["items"]) == 10 and kb["hasMore"],
        f"total={kb['stats']['total']}, items={len(kb['items'])}, hasMore={kb['hasMore']}",
    )
    check(
        "知识库标签非单字",
        labels and all(len(x) >= 2 for x in labels),
        f"sample={labels[:15]}",
    )
    empty = get_knowledge_page(
        page=1,
        page_size=10,
        search="不存在的超长测试词XYZ",
        emotion="all",
        poem_type="all",
    )
    check(
        "知识库空搜索稳定",
        empty["filteredTotal"] == 0 and empty["items"] == [] and empty["hasMore"] is False,
        f"filteredTotal={empty['filteredTotal']}, items={empty['items']}, hasMore={empty['hasMore']}",
    )

    # 7. Polish：应是润色结构，而不是重新生成结构。
    polish = polish_text(PolishRequest(text=text, targetStyle="诗性", useLLM=False))
    check(
        "润色结构完整",
        all(k in polish for k in ["diagnosis", "suggestions", "conservative", "creative", "llmUsed"]),
        f"keys={list(polish.keys())}",
    )
    check(
        "润色保留核心意象",
        all(
            w in "".join(polish["diagnosis"]) + polish["conservative"] + polish["creative"]
            for w in ["地铁", "城市", "肋骨"]
        ),
        f"diagnosis={polish['diagnosis']}, conservative={polish['conservative']}",
    )
    check(
        "润色降级不冒充LLM",
        polish["llmUsed"] is False and "算法" in polish["method"],
        f"method={polish['method']}, llmUsed={polish['llmUsed']}",
    )

    print("\nSUMMARY")
    print(f"total_failures={len(failures)}")
    for name, detail in failures:
        print(f"- {name}: {detail}")
    raise SystemExit(1 if failures else 0)


if __name__ == "__main__":
    main()
