# Hot Rolling Mills Defect Detection

In hot rolling mills, a specific defect known as the **Alpha defect** presents a critical quality challenge. This defect cannot be detected through the existing system because the coil remains under tension in the inspection zones. Since inline detection of Alpha defects is not feasible, current quality control relies on sample observations at the final stage, where only a certain percentage of the total coils produced are inspected. Additionally, manual inspection is time-consuming, and manufacturing and supply chain processes operate under strict time constraints. Although the Alpha defect accounts for only a very small percentage of total production volume, it can still lead to customer complaints and product downgrades.

## Task
During hot rolling, each stage has different process parameters that can contribute to the formation of the defect. Therefore, all stages must be considered to effectively detect the formation of Alpha defects.

**Objective:** Detect the occurrence of the Alpha defect during rolling to prevent customer complaints and reduce downgrades through proactive action.

## Dataset Description
The dataset folder contains the following files:

| File | Dimensions |
|---|---|
| `train.csv` | 1352 × 51 |
| `test.csv` | 339 × 50 |
| `sample_submission.csv` | 339 × 2 |

### Variable Description
| Column Name | Description |
|---|---|
| `CoilID` | Unique identifier for each coil |
| `X1–X49` | Process parameters across multiple stages |
| `Y` | Target variable: Alpha defect occurrence (1 = Defect, 0 = No Defect) |

## Evaluation Metric
A model will be accepted if it achieves:
- **0 false negatives**
- Less than **10% false positives**
- **Recall = 100%**
- **Precision > 90%**

## Submission Criteria
- The submission file must be in `.csv` format.
- The file size should be exactly **339 × 2**.
- Ensure your submission contains:
  - Correct `CoilID` values as per `test.csv`
  - Correct column names as provided in `sample_submission.csv`

## Instructions
1. Click **Download dataset** to obtain the data.
2. Solve the problem in your local environment.
3. Save your predictions in a file named `expected_submission.csv`.
4. Upload your prediction file (.csv) via **Upload File** under the Upload File section.
5. Upload your source code (.ipynb) along with any presentation files via **Upload File** under the Upload Source Code section.
6. Add any instructions or comments in the **Your Answer** section.
7. Click **Submit**.