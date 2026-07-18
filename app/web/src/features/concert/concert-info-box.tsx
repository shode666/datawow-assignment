import { ReactNode } from "react";
import { Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import type { Concert } from "@/lib/concert";

const { Title, Paragraph, Text } = Typography;

const ConcertInfoBox = (props: { concert: Concert, children: ReactNode}) => {
  const {concert, children} = props;
  return (
    <div
              key={concert.id}
              className="rounded-md border border-gray-200 p-6"
            >
              <Title level={4} style={{ color: '#1677ff', marginTop: 0 }}>
                {concert.name}
              </Title>
              <hr className="mb-4 border-gray-200" />

              <Paragraph className="whitespace-pre-wrap text-gray-700">
                {concert.description}
              </Paragraph>

              <div className="flex items-end justify-between">
                <span className="flex items-center gap-2 text-lg text-gray-800">
                  <UserOutlined />
                  <Text disabled>{concert.reservedSeat}</Text>
                  <Text>/ {concert.totalSeat}</Text>

                </span>
                {children}
              </div>
            </div>
  )
}

export default ConcertInfoBox;