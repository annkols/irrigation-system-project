import React from "react";

export default function TopBar() {

    const today = new Date();

    return (

        <div className="topbar">

            
            <div className="topbar-actions">

                <button>

                    <span className="material-symbols-outlined">

                        notifications

                    </span>

                </button>

                <button>

                    <span className="material-symbols-outlined">

                        settings

                    </span>

                </button>

                <button>

                    <span className="material-symbols-outlined">

                        account_circle

                    </span>

                </button>

            </div>

        </div>

    );

}