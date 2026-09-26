---
title: 现实稳定锚
tags: [ 科技 ]
order: 01
hidden: true
---

# 现实稳定锚：功率与半径公式

## 基本假设

设无负载时力场内平均强度为固定常数：

$$
I_0 = I_s = 2
$$

力场等效面积为：

$$
A = 4\pi R^2
$$

## 功率与半径关系

$$
P = I_s \cdot 4\pi R^2
$$

即：

$$
\boxed{P = 4\pi I_s R^2}
$$

反解半径：

$$
\boxed{R = \sqrt{\frac{P}{4\pi I_s}}}
$$

比例关系：

$$
P \propto R^2
$$

$$
R \propto \sqrt{P}
$$

 当 $$I_s = 1$$ 时

$$
P = 4\pi R^2
$$

$$
R = \sqrt{\frac{P}{4\pi}}
$$

数值近似：

$$
P \approx 12.566 R^2
$$

$$
R \approx 0.282 \sqrt{P}
$$

## 有负载时的修正

若总负载功率为 $$L$$，则力场内平均强度：

$$
I = I_0 - \frac{L}{4\pi R^2}
$$

蓝边亮度：

$$
B_{\text{edge}} \propto \frac{I}{I_0} = 1 - \frac{L}{P}
$$

饱和负载：

$$
L_{\text{sat}} = P
$$

逸散源表面蓝光：

$$
B_{\text{source}} \propto \frac{L}{P}
$$