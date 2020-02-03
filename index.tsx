import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap";
import "bootstrap/dist/css/bootstrap.css"; // Import precompiled Bootstrap css

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Trebuchet } from "./simulations/trebuchet";

ReactDOM.render(<Trebuchet />, document.getElementById("react-root"));
