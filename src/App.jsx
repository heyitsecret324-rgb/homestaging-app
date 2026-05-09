// src/App.jsx

import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Plus,
  Trash2,
  Upload,
  Sofa,
  ChevronDown,
} from "lucide-react";

const defaultSpaces = [
  "玄關",
  "客廳",
  "餐廳",
  "廚房",
  "衛浴",
  "主臥室",
  "房間",
  "書房",
];

const createFurniture = () => ({
  id: uuidv4(),
  type: "existing",
  name: "",
  brand: "",
  width: "",
  depth: "",
  height: "",
  quantity: 1,
  color: "",
  material: "",
  price: "",
  image: "",
});

const createSpace = (name = "新空間") => ({
  id: uuidv4(),
  name,
  functionalZone: "",
  items: [createFurniture()],
});

export default function App() {
  const [project, setProject] = useState({
    projectName: "",
    residents: "",
    houseCondition: "",
    designNeeds: "",
    requiredNeeds: ["", "", ""],
  });

  const [spaces, setSpaces] = useState([
    createSpace("客廳"),
  ]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("home-staging-project");

    if (saved) {
      const parsed = JSON.parse(saved);

      setProject(parsed.project);
      setSpaces(parsed.spaces);
    }
  }, []);

  useEffect(() => {
    setSaving(true);

    const timeout = setTimeout(() => {
      localStorage.setItem(
        "home-staging-project",
        JSON.stringify({
          project,
          spaces,
        })
      );

      setSaving(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [project, spaces]);

  const updateProject = (key, value) => {
    setProject((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateRequiredNeed = (index, value) => {
    const next = [...project.requiredNeeds];
    next[index] = value;

    setProject((prev) => ({
      ...prev,
      requiredNeeds: next,
    }));
  };

  const addSpace = () => {
    setSpaces((prev) => [
      ...prev,
      createSpace(),
    ]);
  };

  const removeSpace = (spaceId) => {
    setSpaces((prev) =>
      prev.filter((s) => s.id !== spaceId)
    );
  };

  const updateSpace = (spaceId, key, value) => {
    setSpaces((prev) =>
      prev.map((space) =>
        space.id === spaceId
          ? {
              ...space,
              [key]: value,
            }
          : space
      )
    );
  };

  const addFurniture = (spaceId) => {
    setSpaces((prev) =>
      prev.map((space) =>
        space.id === spaceId
          ? {
              ...space,
              items: [
                ...space.items,
                createFurniture(),
              ],
            }
          : space
      )
    );
  };

  const removeFurniture = (spaceId, itemId) => {
    setSpaces((prev) =>
      prev.map((space) =>
        space.id === spaceId
          ? {
              ...space,
              items: space.items.filter(
                (item) => item.id !== itemId
              ),
            }
          : space
      )
    );
  };

  const updateFurniture = (
    spaceId,
    itemId,
    key,
    value
  ) => {
    setSpaces((prev) =>
      prev.map((space) =>
        space.id === spaceId
          ? {
              ...space,
              items: space.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      [key]: value,
                    }
                  : item
              ),
            }
          : space
      )
    );
  };

  const handleImageUpload = (
    e,
    spaceId,
    itemId
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("圖片需小於 5MB");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateFurniture(
        spaceId,
        itemId,
        "image",
        reader.result
      );
    };

    reader.readAsDataURL(file);
  };

  const totalBudget = useMemo(() => {
    return spaces.reduce((acc, space) => {
      const subtotal = space.items.reduce(
        (sum, item) => {
          if (item.type !== "new") return sum;

          return (
            sum +
            Number(item.quantity || 0) *
              Number(item.price || 0)
          );
        },
        0
      );

      return acc + subtotal;
    }, 0);
  }, [spaces]);

  const existingCount = useMemo(() => {
    return spaces.reduce((acc, space) => {
      return (
        acc +
        space.items.filter(
          (item) => item.type === "existing"
        ).length
      );
    }, 0);
  }, [spaces]);

  const newCount = useMemo(() => {
    return spaces.reduce((acc, space) => {
      return (
        acc +
        space.items.filter(
          (item) => item.type === "new"
        ).length
      );
    }, 0);
  }, [spaces]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#8B6B4D] font-serif">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-12 lg:py-20">
        {/* HERO */}
        <section className="mb-20">
          <div className="flex flex-col lg:flex-row justify-between gap-10">
            <div>
              <div className="uppercase tracking-[0.4em] text-[10px] mb-6 text-[#A68B6D]">
                HOME STAGING PORTFOLIO
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-[#2D241E] leading-none">
                你家的好表
              </h1>

              <p className="mt-6 text-lg text-[#8B6B4D]">
                為你的空間 錦上添花
              </p>

              <p className="mt-2 text-sm tracking-[0.3em] uppercase text-[#A68B6D]">
                景尚空間有限公司
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-[#8B6B4D] mt-2 animate-pulse" />

              <div className="text-sm">
                {saving
                  ? "自動儲存中..."
                  : "已自動儲存"}
              </div>
            </div>
          </div>
        </section>

        {/* BASIC INFO */}
        <section className="rounded-[48px] border border-[#E8DCC4] shadow-xl shadow-[#8B6B4D]/5 bg-white/70 p-8 lg:p-14 mb-16">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-4 h-[1px] bg-[#8B6B4D]" />
            <h2 className="text-3xl text-[#2D241E]">
              基本資料
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-10">
            <InputBlock
              label="案件名稱"
              value={project.projectName}
              onChange={(e) =>
                updateProject(
                  "projectName",
                  e.target.value
                )
              }
            />

            <InputBlock
              label="居住人數"
              value={project.residents}
              onChange={(e) =>
                updateProject(
                  "residents",
                  e.target.value
                )
              }
            />

            <InputBlock
              label="屋況"
              value={project.houseCondition}
              onChange={(e) =>
                updateProject(
                  "houseCondition",
                  e.target.value
                )
              }
            />

            <div className="space-y-3">
              <label className="text-sm tracking-[0.2em] uppercase text-[#A68B6D]">
                設計需求
              </label>

              <textarea
                placeholder="1.風格 2.色調 3.視覺感"
                value={project.designNeeds}
                onChange={(e) =>
                  updateProject(
                    "designNeeds",
                    e.target.value
                  )
                }
                className="w-full min-h-[180px] border-b border-[#E8DCC4] bg-transparent outline-none pb-4 text-lg resize-none"
              />
            </div>
          </div>

          <div className="mt-14">
            <div className="text-sm tracking-[0.2em] uppercase text-[#A68B6D] mb-6">
              必要需求
            </div>

            <div className="space-y-5">
              {project.requiredNeeds.map(
                (need, index) => (
                  <div
                    key={index}
                    className="flex gap-5 items-center"
                  >
                    <div className="text-[#A68B6D] text-lg">
                      0{index + 1}
                    </div>

                    <input
                      value={need}
                      onChange={(e) =>
                        updateRequiredNeed(
                          index,
                          e.target.value
                        )
                      }
                      placeholder="請輸入必要需求"
                      className="w-full bg-transparent border-b border-[#E8DCC4] h-14 outline-none text-lg"
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        {/* SPACE GUIDE */}
        <section className="rounded-[48px] border border-[#E8DCC4] shadow-xl shadow-[#8B6B4D]/5 bg-white/70 p-8 lg:p-14 mb-16">
          <div className="flex flex-wrap items-center justify-between gap-5 mb-10">
            <div className="flex items-center gap-3">
              <div className="w-4 h-[1px] bg-[#8B6B4D]" />

              <h2 className="text-3xl text-[#2D241E]">
                空間導覽
              </h2>
            </div>

            <button
              onClick={addSpace}
              className="h-12 px-6 rounded-full bg-[#2D241E] text-white flex items-center gap-2 hover:opacity-90 transition"
            >
              <Plus size={18} />
              新增空間
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            {defaultSpaces.map((space) => (
              <div
                key={space}
                className="px-5 py-3 rounded-full border border-[#E8DCC4] bg-[#FAF9F6]"
              >
                {space}
              </div>
            ))}
          </div>
        </section>

        {/* SPACES */}
        <div className="space-y-16">
          {spaces.map((space, spaceIndex) => {
            const subtotal = space.items.reduce(
              (sum, item) => {
                if (item.type !== "new") return sum;

                return (
                  sum +
                  Number(item.quantity || 0) *
                    Number(item.price || 0)
                );
              },
              0
            );

            return (
              <section
                key={space.id}
                className="rounded-[48px] border border-[#E8DCC4] shadow-xl shadow-[#8B6B4D]/5 bg-white/70 overflow-hidden"
              >
                <div className="p-8 lg:p-14">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-12">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-[#F2E8D8] flex items-center justify-center">
                        <Sofa size={24} />
                      </div>

                      <div>
                        <div className="text-xs tracking-[0.4em] uppercase text-[#A68B6D] mb-2">
                          Space
                        </div>

                        <input
                          value={space.name}
                          onChange={(e) =>
                            updateSpace(
                              space.id,
                              "name",
                              e.target.value
                            )
                          }
                          className="bg-transparent text-3xl text-[#2D241E] outline-none border-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        removeSpace(space.id)
                      }
                      className="h-12 px-5 rounded-full border border-[#E8DCC4] flex items-center gap-2 hover:opacity-90 transition"
                    >
                      <Trash2 size={18} />
                      刪除空間
                    </button>
                  </div>

                  {/* Functional Zone */}
                  <div className="mb-14">
                    <div className="text-sm tracking-[0.2em] uppercase text-[#A68B6D] mb-5">
                      功能分區
                    </div>

                    <textarea
                      value={space.functionalZone}
                      onChange={(e) =>
                        updateSpace(
                          space.id,
                          "functionalZone",
                          e.target.value
                        )
                      }
                      placeholder="請輸入功能分區"
                      className="w-full min-h-[120px] border-b border-[#E8DCC4] bg-transparent outline-none pb-4 text-lg resize-none"
                    />
                  </div>

                  {/* Furniture */}
                  <div className="space-y-10">
                    {space.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[32px] border border-[#E8DCC4] p-6 lg:p-10 bg-[#FCFBF8]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
                          <div className="flex gap-3">
                            <button
                              onClick={() =>
                                updateFurniture(
                                  space.id,
                                  item.id,
                                  "type",
                                  "existing"
                                )
                              }
                              className={`h-12 px-5 rounded-full transition ${
                                item.type ===
                                "existing"
                                  ? "bg-[#2D241E] text-white"
                                  : "border border-[#E8DCC4]"
                              }`}
                            >
                              現有
                            </button>

                            <button
                              onClick={() =>
                                updateFurniture(
                                  space.id,
                                  item.id,
                                  "type",
                                  "new"
                                )
                              }
                              className={`h-12 px-5 rounded-full transition ${
                                item.type === "new"
                                  ? "bg-[#8B6B4D] text-white"
                                  : "border border-[#E8DCC4]"
                              }`}
                            >
                              新購
                            </button>
                          </div>

                          <button
                            onClick={() =>
                              removeFurniture(
                                space.id,
                                item.id
                              )
                            }
                            className="h-12 px-5 rounded-full border border-[#E8DCC4] flex items-center gap-2 hover:opacity-90 transition"
                          >
                            <Trash2 size={16} />
                            刪除家具
                          </button>
                        </div>

                        <div className="grid lg:grid-cols-3 gap-8">
                          <InputBlock
                            label="名稱"
                            value={item.name}
                            onChange={(e) =>
                              updateFurniture(
                                space.id,
                                item.id,
                                "name",
                                e.target.value
                              )
                            }
                          />

                          <InputBlock
                            label="品牌"
                            value={item.brand}
                            onChange={(e) =>
                              updateFurniture(
                                space.id,
                                item.id,
                                "brand",
                                e.target.value
                              )
                            }
                          />

                          <div>
                            <label className="text-sm tracking-[0.2em] uppercase text-[#A68B6D] mb-3 block">
                              圖片
                            </label>

                            <label className="h-14 rounded-2xl border border-dashed border-[#E8DCC4] flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 transition">
                              <Upload size={18} />

                              <span>
                                上傳圖片
                              </span>

                              <input
                                type="file"
                                accept=".jpg,.png,.webp"
                                className="hidden"
                                onChange={(e) =>
                                  handleImageUpload(
                                    e,
                                    space.id,
                                    item.id
                                  )
                                }
                              />
                            </label>

                            {item.image && (
                              <img
                                src={item.image}
                                alt=""
                                className="mt-5 rounded-2xl h-40 object-cover w-full"
                              />
                            )}
                          </div>

                          <InputBlock
                            label="寬(cm)"
                            value={item.width}
                            onChange={(e) =>
                              updateFurniture(
                                space.id,
                                item.id,
                                "width",
                                e.target.value
                              )
                            }
                          />

                          <InputBlock
                            label="深(cm)"
                            value={item.depth}
                            onChange={(e) =>
                              updateFurniture(
                                space.id,
                                item.id,
                                "depth",
                                e.target.value
                              )
                            }
                          />

                          <InputBlock
                            label="高(cm)"
                            value={item.height}
                            onChange={(e) =>
                              updateFurniture(
                                space.id,
                                item.id,
                                "height",
                                e.target.value
                              )
                            }
                          />

                          <InputBlock
                            label="數量"
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateFurniture(
                                space.id,
                                item.id,
                                "quantity",
                                e.target.value
                              )
                            }
                          />

                          <InputBlock
                            label="顏色"
                            value={item.color}
                            onChange={(e) =>
                              updateFurniture(
                                space.id,
                                item.id,
                                "color",
                                e.target.value
                              )
                            }
                          />

                          <InputBlock
                            label="材質"
                            value={item.material}
                            onChange={(e) =>
                              updateFurniture(
                                space.id,
                                item.id,
                                "material",
                                e.target.value
                              )
                            }
                          />

                          <InputBlock
                            label="單價"
                            type="number"
                            value={item.price}
                            onChange={(e) =>
                              updateFurniture(
                                space.id,
                                item.id,
                                "price",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-10">
                    <button
                      onClick={() =>
                        addFurniture(space.id)
                      }
                      className="h-12 px-6 rounded-full bg-[#8B6B4D] text-white flex items-center gap-2 hover:opacity-90 transition"
                    >
                      <Plus size={18} />
                      新增家具
                    </button>
                  </div>
                </div>

                {/* subtotal */}
                <div className="bg-[#2D241E] text-white px-8 lg:px-14 py-10">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex gap-10">
                      <div>
                        <div className="text-xs tracking-[0.3em] uppercase opacity-60 mb-2">
                          Existing
                        </div>

                        <div className="text-3xl">
                          {
                            space.items.filter(
                              (i) =>
                                i.type ===
                                "existing"
                            ).length
                          }
                        </div>
                      </div>

                      <div>
                        <div className="text-xs tracking-[0.3em] uppercase opacity-60 mb-2">
                          New
                        </div>

                        <div className="text-3xl">
                          {
                            space.items.filter(
                              (i) =>
                                i.type === "new"
                            ).length
                          }
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs tracking-[0.3em] uppercase opacity-60 mb-2">
                        Space Budget
                      </div>

                      <div className="text-4xl font-bold">
                        NT$ {subtotal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* TOTAL */}
        <section className="mt-20 rounded-[48px] bg-[#2D241E] text-white px-8 lg:px-16 py-14">
          <div className="flex flex-col lg:flex-row justify-between gap-10">
            <div className="flex gap-10">
              <div>
                <div className="text-xs tracking-[0.4em] uppercase opacity-60 mb-3">
                  Existing Items
                </div>

                <div className="text-5xl font-bold">
                  {existingCount}
                </div>
              </div>

              <div>
                <div className="text-xs tracking-[0.4em] uppercase opacity-60 mb-3">
                  New Items
                </div>

                <div className="text-5xl font-bold">
                  {newCount}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs tracking-[0.4em] uppercase opacity-60 mb-3">
                Total Budget
              </div>

              <div className="text-5xl lg:text-6xl font-bold">
                NT$ {totalBudget.toLocaleString()}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function InputBlock({
  label,
  value,
  onChange,
  type = "text",
}) {
  return (
    <div>
      <label className="text-sm tracking-[0.2em] uppercase text-[#A68B6D] mb-3 block">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={`請輸入${label}`}
        className="w-full h-14 bg-transparent border-b border-[#E8DCC4] outline-none text-lg"
      />
    </div>
  );
}
