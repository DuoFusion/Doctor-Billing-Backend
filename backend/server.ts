import app from "./src";
import { config } from "./config";

const port = config.PORT || "3000";

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
